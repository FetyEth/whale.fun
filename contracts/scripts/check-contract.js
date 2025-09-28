import { createPublicClient, http, formatEther } from 'viem';
import { celoAlfajores } from 'viem/chains';
import fs from 'fs';

// Contract addresses (latest deployment)
const FACTORY_ADDRESS = '0x0bb4da9a543d0c8482843f49f80222f936310637';

// Load ABIs from config directory
const TokenFactoryABI = JSON.parse(fs.readFileSync('../config/abi/TokenFactoryRoot.json', 'utf8'));
const CreatorTokenABI = JSON.parse(fs.readFileSync('../config/abi/CreatorToken.json', 'utf8'));

async function checkContract() {
    console.log('🔍 CHECKING CONTRACT STATE');
    console.log('==========================');
    
    // Setup public client
    const publicClient = createPublicClient({
        chain: celoAlfajores,
        transport: http('https://alfajores-forno.celo-testnet.org')
    });
    
    console.log('🏭 Factory Address:', FACTORY_ADDRESS);
    
    try {
        // Get all tokens from factory
        console.log('\n📋 Getting all tokens from factory...');
        const allTokens = await publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: TokenFactoryABI,
            functionName: 'getAllTokens'
        });
        
        console.log('📊 Total tokens found:', allTokens.length);
        
        if (allTokens.length === 0) {
            console.log('❌ No tokens found! Factory might be new.');
            return;
        }
        
        // Check all tokens to find the dfsfds token
        console.log('🔍 All token addresses:');
        allTokens.forEach((token, index) => {
            console.log(`  ${index + 1}. ${token}`);
        });
        
        const latestToken = allTokens[allTokens.length - 1];
        console.log('🎯 Latest Token Address:', latestToken);
        
        // Check token state in detail
        console.log('\n🔍 Checking token state...');
        
        const [
            name, 
            symbol, 
            contractBalance, 
            totalSupply, 
            currentPrice, 
            totalSold,
            creator,
            description
        ] = await Promise.all([
            publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'name'
            }),
            publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'symbol'
            }),
            publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'balanceOf',
                args: [latestToken] // Contract's own balance
            }),
            publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'totalSupply'
            }),
            publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'getCurrentPrice'
            }),
            publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'totalSold'
            }).catch(() => 0n),
            publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'creator'
            }),
            publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'description'
            })
        ]);
        
        console.log('\n📝 TOKEN DETAILS:');
        console.log('================');
        console.log('Name:', name);
        console.log('Symbol:', symbol);
        console.log('Description:', description);
        console.log('Creator:', creator);
        
        console.log('\n📊 TOKEN SUPPLY ANALYSIS:');
        console.log('========================');
        console.log('Total Supply (raw):', totalSupply.toString(), 'wei');
        console.log('Total Supply (tokens):', formatEther(totalSupply));
        console.log('Contract Balance (raw):', contractBalance.toString(), 'wei');
        console.log('Contract Balance (tokens):', formatEther(contractBalance));
        console.log('Total Sold (raw):', totalSold.toString(), 'wei');
        console.log('Total Sold (tokens):', formatEther(totalSold));
        
        console.log('\n💰 PRICING INFO:');
        console.log('================');
        console.log('Current Price (raw):', currentPrice.toString(), 'wei');
        console.log('Current Price (ETH):', formatEther(currentPrice));
        
        // Calculate available tokens
        const availableTokens = contractBalance;
        console.log('\n✅ AVAILABILITY:');
        console.log('================');
        console.log('Available for Purchase:', formatEther(availableTokens), 'tokens');
        console.log('Available (raw):', availableTokens.toString(), 'wei');
        
        // Check if the issue is with token supply
        if (totalSupply < parseEther('1000')) {
            console.log('\n⚠️  WARNING: Total supply is very low!');
            console.log('   This suggests the token was created with BigInt() instead of parseEther()');
            console.log('   Expected: ~1,000,000 tokens (1e24 wei)');
            console.log('   Actual:', formatEther(totalSupply), 'tokens');
        }
        
        // Try to calculate buy cost for 1 token
        console.log('\n💵 BUY COST CALCULATION:');
        console.log('=======================');
        try {
            const oneToken = parseEther('1');
            const buyCost = await publicClient.readContract({
                address: latestToken,
                abi: CreatorTokenABI,
                functionName: 'calculateBuyCost',
                args: [oneToken]
            });
            
            console.log('Cost for 1 token (raw):', buyCost.toString(), 'wei');
            console.log('Cost for 1 token (ETH):', formatEther(buyCost));
            
            // Check if we can afford it and if contract has tokens
            if (availableTokens >= oneToken) {
                console.log('✅ Contract has enough tokens for purchase');
            } else {
                console.log('❌ Contract does NOT have enough tokens');
                console.log('   Available:', formatEther(availableTokens));
                console.log('   Requested:', formatEther(oneToken));
            }
            
        } catch (error) {
            console.error('❌ Error calculating buy cost:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the check
checkContract().catch(console.error);
