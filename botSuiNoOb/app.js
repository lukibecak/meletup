const { getFullnodeUrl, SuiClient } = require('@mysten/sui.js/client');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
// const sui = require('@mysten/sui.js');
const {gettimeclaim,getAllCoin,sendFee,sendOcean} = require('./module.js');
const fs = require('fs');
const { Keypair } = require('@mysten/sui.js/cryptography');
const colors = require('colors')

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function pharses() {
    try {
        // Baca file JSON secara sinkron
        const data = fs.readFileSync('mnemonic.json', 'utf8');
      
        // Ubah data JSON menjadi objek JavaScript
        const jsonData = JSON.parse(data);
      
        return jsonData;
    } catch (error) {
        console.error('Gagal mengambil data dari file JSON:', error);
    }
}

function checkTime(currentTimestamp,kapal) {
    // Hitung timestamp 3 jam setelah klaim terakhir
    let differenceInMilliseconds,nextClaimTimestamp,claimTime;
    if (kapal === 0) {
        nextClaimTimestamp = currentTimestamp + (2 * 60 * 60 * 1000); // 3 jam * 60 menit * 60 detik * 1000 milidetik
        differenceInMilliseconds = nextClaimTimestamp - Date.now();
        claimTime = nextClaimTimestamp < Date.now()

    }
    if (kapal === 1) {
        nextClaimTimestamp = currentTimestamp + (3 * 60 * 60 * 1000); // 3 jam * 60 menit * 60 detik * 1000 milidetik
        differenceInMilliseconds = nextClaimTimestamp - Date.now();
        claimTime = nextClaimTimestamp < Date.now()
    }
    if (kapal === 2) {
        nextClaimTimestamp = currentTimestamp + (4 * 60 * 60 * 1000); // 3 jam * 60 menit * 60 detik * 1000 milidetik
        differenceInMilliseconds = nextClaimTimestamp - Date.now();
        claimTime = nextClaimTimestamp < Date.now()
    }
  
    // Konversi selisih waktu menjadi jam, menit, dan detik
    const hours = Math.floor(differenceInMilliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((differenceInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((differenceInMilliseconds % (1000 * 60)) / 1000);
  
    // Format waktu tersisa menjadi jam:menit:detik
    const formattedTimeLeft = `${hours}:${minutes}:${seconds}`;
  
    // Format waktu terakhir klaim
    const lastClaim = new Date(currentTimestamp).toLocaleTimeString();
  
    // Format waktu klaim berikutnya
  
    // Mengembalikan hasil
    return {
      lastClaim: lastClaim,
      claimTime: claimTime,
      resTimeForClaim: formattedTimeLeft,
      inMil:differenceInMilliseconds
    };
}

async function sortArray(array) {
    try {
        // Menunggu hasil pengurutan array
        const sortedArray = await new Promise((resolve, reject) => {
            // Menggunakan metode sort() untuk mengurutkan array
            array.sort((a, b) => a - b);
            resolve(array);
        });
        return sortedArray;
    } catch (error) {
        throw error;
    }
}


const client = new SuiClient({
	url: "https://fullnode.mainnet.sui.io",
});



(async () => {
  try {
    while (true) {
        let ulangi =[]
        const pharse = await pharses();
        let i = 1
        for (const p of pharse) {
            const keypair = Ed25519Keypair.deriveKeypair(p);
            
            const address = keypair.getPublicKey().toSuiAddress()

            const {data} = await client.getCoins({
                owner: address,
            });
            console.log(colors.cyan(`  [-] Account ${i} Address:`));
            console.log(colors.magenta(`      [-] ${address}`));

            const balances = await getAllCoin(address)
            console.log(colors.cyan('  [-] Account Balance:'));
            for (const b of balances) {
                if (b.coinType === '0x2::sui::SUI') {
                    console.log(colors.cyan('      [-] SUI:'),parseFloat(b.totalBalance/1000000000));
                }else{
                    console.log(colors.cyan('      [-] OCEAN:'),parseFloat(b.totalBalance/1000000000));
                }
            }
            const claim = await gettimeclaim(address)
            
            if (claim.error) {
                console.log(colors.yellow('  [-] Lakukan claim pertama terlebih dahulu'));
            }else{
                console.log(colors.cyan('  [-] Starting Claim'));
                const check = checkTime(parseInt(claim.data.content.fields.last_claim),claim.data.content.fields.boat)
                if (check.claimTime) {
                    await sendFee(p)
                    const packageObjectId = '0x1efaf509c9b7e986ee724596f526a22b474b15c376136772c00b8452f204d2d1';
                    const tx = new TransactionBlock();
                    const gasBudget = '10000000';
                    tx.setGasBudget(gasBudget);
                    tx.moveCall({
                        target: `${packageObjectId}::game::claim`,
                        arguments: [tx.object("0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a"),
                                    tx.pure('0x0000000000000000000000000000000000000000000000000000000000000006'),
                        ],
                    });
                    const result = await client.signAndExecuteTransactionBlock({
                        signer: keypair,
                        transactionBlock: tx,
                    });
                    console.log(colors.green('      [-] Success Claim'));
                }else{
                    console.log(`${colors.cyan('      [-]')} Terakhir claim: ${colors.bgMagenta(`${check.lastClaim}`)} Claim lagi dalam: ${colors.magenta(`${check.resTimeForClaim}`)}`);
                }
                console.log();
                ulangi.push(check.inMil)
            }

            await delay(2000)
            i++
        }
        console.log(`${colors.cyan('\n\n  ')} ${colors.magenta('AKAN ULANG SESUAI WAKTU CLAIM TERDEKAT')}\n`)
        const dekat = await sortArray(ulangi)
        await delay(dekat[0])
        console.clear();
    }
  } catch (error) {
    console.error(error);
  }
})();