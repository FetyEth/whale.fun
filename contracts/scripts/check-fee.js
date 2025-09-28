import { createPublicClient, http, formatEther } from 'viem';
import { celoAlfajores } from 'viem/chains';
import fs from 'fs';

// Contract addresses (latest deployment)
const FACTORY_ADDRESS = '0x0bb4da9a543d0c8482843f49f80222f936310637';

// Load ABIs from config directory
const TokenFactoryABI = JSON.parse(fs.readFileSync('../config/abi/TokenFactoryRoot.json', 'utf8'));

async function checkLaunchFee() {
    console.log('🔍 CHECKING LAUNCH FEE');
    console.log('======================');
    
    // Setup public client
    const publicClient = createPublicClient({
        chain: celoAlfajores,
        transport: http('https://alfajores-forno.celo-testnet.org')
    });
    
    console.log('🏭 Factory Address:', FACTORY_ADDRESS);
    
    try {
        // Get launch fee
        const launchFee = await publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: TokenFactoryABI,
            functionName: 'launchFee'
        });
        
        console.log('💰 Launch Fee:', formatEther(launchFee), 'ETH');
        console.log('💰 Launch Fee (wei):', launchFee.toString());
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the check
checkLaunchFee().catch(console.error);
