# GataBot Automation Script

## Overview
This repository contains a script `gata.js` designed to automate tasks on the gata.xyz platform. The script initializes with user-specified private keys, optionally utilizes proxies, and automates task processing to accumulate points. It includes error handling, task retrieval, and score submission functionalities.

## Current Limitations
The script successfully handles authentication, task retrieval, and score submission. However, it encounters issues with accurately accumulating points post-task submission. This appears to be a problem with the way scores are computed or accepted by the platform.

## Contributions
Contributions are welcome! If you have any improvements or fixes, particularly for the point accumulation issue, please feel free to fork this repository, make your changes, and submit a pull request.

## Setup and Running

### Requirements
- Node.js
- npm (Node Package Manager)

### Installation
1. Clone the repository:
   ```bash
   git clone https://your-repository-url.git
   cd your-repository-directory

### Install the required packages:

2. ```bash
   npm install

## Configuration
Private Keys: Place all your private keys, one per line, in the pk.txt file.
Proxies (Optional): If you wish to use proxies, place them in the proxy.txt file, formatted one per line.

### Running the Script
To run the script, use the following command:

node gata.js

The script will prompt you to choose whether to use proxies. Answer yes or no according to your setup.
