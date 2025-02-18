const axios = require('axios');
const ethers = require('ethers');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

// 🟢 Função para carregar as chaves privadas do arquivo "pk.txt"
function loadPrivateKeys() {
    if (!fs.existsSync('pk.txt')) {
        console.error('❌ ERRO: Arquivo pk.txt não encontrado!');
        process.exit(1);
    }
    return fs.readFileSync('pk.txt', 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// 🟢 Função para carregar os proxies do arquivo "proxy.txt"
function loadProxies() {
    if (!fs.existsSync('proxy.txt')) {
        console.warn('⚠️ Aviso: Arquivo proxy.txt não encontrado! Rodando sem proxy.');
        return [];
    }
    return fs.readFileSync('proxy.txt', 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// 📥 Carregar chaves privadas e proxies
const privateKeys = loadPrivateKeys();
const proxies = loadProxies();

class GataBot {
    constructor(privateKey, proxy = null) {
        this.privateKey = privateKey;
        this.proxy = proxy;
        this.baseUrls = {
            earn: 'https://earn.aggregata.xyz',
            agent: 'https://agent.gata.xyz',
            chat: 'https://chat.gata.xyz'
        };
        this.tokens = {
            bearer: '',
            aggr_llm: '',
            aggr_task: ''
        };
        this.stats = {
            dailyPoints: 0,
            totalPoints: 0,
            completedCount: 0
        };
        this.minDelay = 5000;
        this.maxDelay = 15000;
        this.retryDelay = 20000; // Aumentado para punir falhas
        this.axiosInstance = this.createAxiosInstance();
    }

    createAxiosInstance() {
        const config = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        };
        if (this.proxy) {
            console.log(`🟢 Usando proxy: ${this.proxy}`);
            config.proxy = false;
            config.httpsAgent = new HttpsProxyAgent(this.proxy);
        } else {
            console.log('🔵 Sem proxy configurado.');
        }
        return axios.create(config);
    }

    async initialize() {
        try {
            const wallet = new ethers.Wallet(this.privateKey);
            const address = wallet.address;
            console.log(`🔑 Inicializando com endereço: ${address}`);

            const nonceResponse = await this.axiosInstance.post(`${this.baseUrls.earn}/api/signature_nonce`, { address });
            const authNonce = nonceResponse.data.auth_nonce;
            const signature = await wallet.signMessage(authNonce);

            const authResponse = await this.axiosInstance.post(`${this.baseUrls.earn}/api/authorize`, {
                public_address: address,
                signature_code: signature,
                invite_code: ''
            });
            
            this.tokens.bearer = authResponse.data.token;
            console.log('✅ Autenticação bem-sucedida!');
            await this.getTaskToken();
            await this.getLLMToken();
            await this.updateRewardsData();
            return true;
        } catch (error) {
            console.error('❌ Erro na inicialização:', error.message);
            return false;
        }
    }

    async getTaskToken() {
        const response = await this.axiosInstance.post(`${this.baseUrls.earn}/api/grant`, { type: 1 }, {
            headers: { Authorization: `Bearer ${this.tokens.bearer}` }
        });
        this.tokens.aggr_task = response.data.token;
        console.log('🎯 Token de tarefa obtido!');
    }

    async getLLMToken() {
        const response = await this.axiosInstance.post(`${this.baseUrls.earn}/api/grant`, { type: 0 }, {
            headers: { Authorization: `Bearer ${this.tokens.bearer}` }
        });
        this.tokens.aggr_llm = response.data.token;
        console.log('🧠 Token de LLM obtido!');
    }

    async getTask() {
        try {
            const response = await this.axiosInstance.get(`${this.baseUrls.agent}/api/task`, {
                headers: {
                    'Authorization': `Bearer ${this.tokens.aggr_task}`,
                    'X-Gata-Endpoint': 'pc-browser'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ Erro ao obter tarefa:', error.message);
            return null;
        }
    }

    async updateRewardsData() {
        try {
            const response = await this.axiosInstance.get(`${this.baseUrls.agent}/api/task_rewards`, {
                headers: { Authorization: `Bearer ${this.tokens.aggr_task}` }
            });
            const data = response.data;
            this.stats.totalPoints = parseInt(data.total) || 0;
            this.stats.completedCount = parseInt(data.completed_count) || 0;
        } catch (error) {
            console.error('❌ Erro ao atualizar recompensas:', error.message);
        }
    }

    async submitScore(taskId, score) {
        try {
            console.log(`📤 Enviando pontuação ${score} para a tarefa ${taskId}...`);
            await this.axiosInstance.patch(`${this.baseUrls.agent}/api/task`, {
                id: taskId,
                score: score.toString()
            }, {
                headers: { 'Authorization': `Bearer ${this.tokens.aggr_task}` }
            });
            await this.updateRewardsData();
        } catch (error) {
            console.error('❌ Erro ao enviar score:', error.message);
        }
    }

    async start() {
        console.log('🚀 Iniciando operações do bot...');
        while (true) {
            const beforePoints = this.stats.totalPoints;
            const task = await this.getTask();
            if (!task || !task.id) {
                console.log('⏳ Nenhuma tarefa disponível, aguardando...');
                await this.sleep(this.minDelay);
                continue;
            }
            console.log(`🛠️ Processando tarefa ${task.id}`);
            const score = (Math.random() * 1.8 - 0.9).toFixed(2);
            await this.submitScore(task.id, score);
            await this.sleep(3000);
            await this.updateRewardsData();
            if (this.stats.totalPoints <= beforePoints) {
                console.log('⚠️ Nenhum ponto ganho! Esperando mais tempo antes de tentar novamente...');
                await this.sleep(this.retryDelay);
            } else {
                await this.sleep(this.minDelay + Math.random() * (this.maxDelay - this.minDelay));
            }
        }
    }

    async sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

privateKeys.forEach((privateKey, index) => {
    const proxy = proxies[index] || null;
    const bot = new GataBot(privateKey, proxy);
    bot.initialize().then(success => { if (success) bot.start(); });
});