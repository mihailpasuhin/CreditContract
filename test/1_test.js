const CreditContract = artifacts.require("./Credit.sol");
const BigNumber = web3.utils.BN; 

const Statuses = {
	"NOT_SET": new BigNumber(0),
	"ACCEPTED": new BigNumber(1),
	"DECLINED": new BigNumber(2)
}

contract('test', async (accounts) => {

	let Credit;
    
    before(async function () {
    	Credit = await CreditContract.deployed();
	});
    
    let owner = accounts[0];
    let user = accounts[1];
	let delegate = accounts[2];
	let another_user = accounts[3];

	let timestamp;

	let one_ether = new BigNumber(web3.utils.toWei("1", "ether"));
	let one_thousand_wei = new BigNumber(web3.utils.toWei("1000", "wei"));

	describe('user makes all himself', async function() {

	    it('fallback function [send 1 ether]', async function() {
	    
	        let contractBalanceBefore = await web3.eth.getBalance(Credit.address);

	        await Credit.send(one_ether);

	        let contractBalanceAfter = await web3.eth.getBalance(Credit.address);

	        assert.equal(contractBalanceAfter-contractBalanceBefore, one_ether, "Contract balance is not correct");
	    });

	    it('make request [1000 wei]', async function() {
			
			await Credit.makeRequest(one_thousand_wei, {from: user});
	    
		    let events = await Credit.getPastEvents('NewRequest', { fromBlock: 0, toBlock: 'latest' } );
		    
		    timestamp = events[events.length - 1].args.timestamp.toString();

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(new BigNumber(0).eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	    it('try to accept from not owner', async function() {
			
			let error;
			try {
				await Credit.userAccept(timestamp, one_thousand_wei, {from: another_user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);
			
	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(new BigNumber(0).eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	    it('accept from owner', async function() {
			
			await Credit.bankAccept(user, timestamp, one_thousand_wei, {from: owner});

	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

		it('try to repeated accept from owner', async function() {
			
			let error;
			try {
				await Credit.bankAccept(user, timestamp, one_thousand_wei, {from: owner});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);
			
	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

		it('try to accept from another user', async function() {
			
			let error;
			try {
				await Credit.userAccept(timestamp, one_thousand_wei, {from: another_user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });


	    it('accept from user', async function() {

	    	let userBalanceBefore = new BigNumber(await web3.eth.getBalance(user));

			let trans = await Credit.userAccept(timestamp, {from: user});

			let userBalanceAfter = new BigNumber(await web3.eth.getBalance(user));

			let gasCost = new BigNumber(await getGasCost(trans));

			assert.isTrue(userBalanceAfter.eq(userBalanceBefore.add(new BigNumber(1000)).sub(gasCost)), "User balance is not correct");

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.userStatus), "User status is not correct");

	    });

		it('try to repeated accept from user', async function() {
			
			let error;
			try {
				let trans = await Credit.userAccept(timestamp, {from: user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);
			
	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.userStatus), "User status is not correct");

	    });

	});

	describe('delegate makes all for user', async function() {

		it('set delegate', async function() {
			
			await Credit.addUserDelegate(delegate, {from: user});
	    
	    	let delegateStatus = await Credit.delegates.call(user, delegate);

	    	assert.isTrue(delegateStatus, "user is not a delegate");

	    });

	    it('make request [1000 wei]', async function() {
			
			await Credit.makeDelegateRequest(user, one_thousand_wei, {from: delegate});
	    
		    let events = await Credit.getPastEvents('NewRequest', { fromBlock: 0, toBlock: 'latest' } );
		    
		    timestamp = events[events.length - 1].args.timestamp.toString();

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(new BigNumber(0).eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	    it('accept from owner', async function() {
			
			await Credit.bankAccept(user, timestamp, one_thousand_wei, {from: owner});

	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

		it('try to accept from another user (not delegate)', async function() {
			
			let error;
			try {
				await Credit.userDelegateAccept(user, timestamp, {from: another_user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	    it('accept from delegate', async function() {

	    	let userBalanceBefore = new BigNumber(await web3.eth.getBalance(user));

			let trans = await Credit.userDelegateAccept(user, timestamp, {from: delegate});

			let userBalanceAfter = new BigNumber(await web3.eth.getBalance(user));

			assert.isTrue(userBalanceAfter.eq(userBalanceBefore.add(new BigNumber(1000))), "User balance is not correct");

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.userStatus), "User status is not correct");

	    });

		it('try to repeated accept from delegate', async function() {
			
			let error;
			try {
				let trans = await Credit.userDelegateAccept(user, timestamp, {from: delegate});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);
			
	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.userStatus), "User status is not correct");

	    });

		it('delete delegate', async function() {
			
			await Credit.deleteUserDelegate(delegate, {from: user});
	    
	    	let delegateStatus = await Credit.delegates.call(user, delegate);

	    	assert.isFalse(delegateStatus, "user is delegate yet");

	    });

	    it('try to make request [1000 wei]', async function() {
			
			let error;
			try {
				await Credit.makeDelegateRequest(user, one_thousand_wei, {from: delegate});
	    	} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error, "delegate can make request yet");

	    });
    
	});

	describe('bank decline the request', async function() {

	    it('make request [1000 wei]', async function() {
			
			await Credit.makeRequest(one_thousand_wei, {from: user});
	    
		    let events = await Credit.getPastEvents('NewRequest', { fromBlock: 0, toBlock: 'latest' } );
		    
		    timestamp = events[events.length - 1].args.timestamp.toString();

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(new BigNumber(0).eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	    it('decline from owner', async function() {
			
			await Credit.bankDecline(user, timestamp, {from: owner});

	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(new BigNumber(0).eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.DECLINED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	    it('try repeat decline from owner', async function() {

	    	let error;

	    	try {
				await Credit.bankDecline(user, timestamp, {from: owner});
	    	} catch(err) {
	    		error = err;
	    	}
			
			assert.instanceOf(error, Error);

	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(new BigNumber(0).eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.DECLINED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	    it('try to accept from user', async function() {

	    	let error;
			try {
				await Credit.userAccept(timestamp, {from: user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	});

	describe('user decline the request', async function() {

	    it('make request [1000 wei]', async function() {
			
			await Credit.makeRequest(one_thousand_wei, {from: user});
	    
		    let events = await Credit.getPastEvents('NewRequest', { fromBlock: 0, toBlock: 'latest' } );
		    
		    timestamp = events[events.length - 1].args.timestamp.toString();

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(new BigNumber(0).eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	   	it('try decline from user before bank accept', async function() {

	    	let error;
			try {
				await Credit.userDecline(timestamp, {from: user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('accept from owner', async function() {
			
			await Credit.bankAccept(user, timestamp, one_thousand_wei, {from: owner});

	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });


	    it('decline from user', async function() {

	    	let bankBalanceBefore = new BigNumber(await web3.eth.getBalance(Credit.address));

			await Credit.userDecline(timestamp, {from: user});
			
	    	let bankBalanceAfter = new BigNumber(await web3.eth.getBalance(Credit.address));

			assert.isTrue(bankBalanceBefore.eq(bankBalanceAfter), "Bank balance is not correct");

			let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.DECLINED.eq(request.userStatus), "User status is not correct");

	    });

	    it('try repeat decline from user', async function() {

	    	let error;
			try {
				await Credit.userDecline(timestamp, {from: user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	   	it('try to accept from user', async function() {

	    	let error;
			try {
				await Credit.userAccept(timestamp, {from: user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	});


	describe('delegate decline the request', async function() {

		it('set delegate', async function() {
			
			await Credit.addUserDelegate(delegate, {from: user});
	    
	    	let delegateStatus = await Credit.delegates.call(user, delegate);

	    	assert.isTrue(delegateStatus, "user is not a delegate");

	    });


	    it('make request [1000 wei]', async function() {
			
			await Credit.makeDelegateRequest(user, one_thousand_wei, {from: delegate});
	    
		    let events = await Credit.getPastEvents('NewRequest', { fromBlock: 0, toBlock: 'latest' } );
		    
		    timestamp = events[events.length - 1].args.timestamp.toString();

	    	let request = await Credit.requests.call(user, timestamp);

	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(new BigNumber(0).eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });


	    it('try to decline from delegate before bank accept', async function() {

	    	let error;
			try {
				await Credit.userDelegateDecline(user, timestamp, {from: delegate});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('accept from owner', async function() {
			
			await Credit.bankAccept(user, timestamp, one_thousand_wei, {from: owner});

	    	let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.NOT_SET.eq(request.userStatus), "User status is not correct");

	    });

	    it('try to decline from another user (not delegate)', async function() {

	    	let error;
			try {
				await Credit.userDelegateDecline(user, timestamp, {from: another_user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('decline from delegate', async function() {

	    	let bankBalanceBefore = new BigNumber(await web3.eth.getBalance(Credit.address));

			await Credit.userDelegateDecline(user, timestamp, {from: delegate});

	    	let bankBalanceAfter = new BigNumber(await web3.eth.getBalance(Credit.address));

			assert.isTrue(bankBalanceBefore.eq(bankBalanceAfter), "Bank balance is not correct");

			let request = await Credit.requests.call(user, timestamp);
	    	
	    	assert.isTrue(one_thousand_wei.eq(request.requestSum), "Request sum is not correct");
			assert.isTrue(one_thousand_wei.eq(request.acceptedSum), "Accepted sum is not correct");
	    	assert.isTrue(Statuses.ACCEPTED.eq(request.bankStatus), "Bank status is not correct");
	    	assert.isTrue(Statuses.DECLINED.eq(request.userStatus), "User status is not correct");

	    });


	    it('try repeat decline from delegate', async function() {

	    	let error;
			try {
				await Credit.userDelegateDecline(user, timestamp, {from: delegate});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('try to accept from delegate', async function() {

	    	let error;
			try {
				await Credit.userDelegateAccept(timestamp, {from: user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	   	it('try to accept from user', async function() {

	    	let error;
			try {
				await Credit.userAccept(timestamp, {from: user});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	});

	describe('call functions with wrong arguments', async function() {

		let wrongAddress = '0x0000000000000000000000000000000000000000';
		let wrongTimestamp = 0;
		let wrongAmount = 0;
		let rightAddress = accounts[4];
		let rightTimestamp = 1;
		let rightAmount = 1;

	    it('makeRequest', async function() {

	    	let error;
			try {
				await Credit.makeRequest(wrongAmount);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('makeDelegateRequest', async function() {

	    	let error;
			try {
				await Credit.makeDelegateRequest(wrongAddress, rightAmount);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('makeDelegateRequest', async function() {

	    	let error;
			try {
				await Credit.makeDelegateRequest(rightAddress, wrongAmount);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('bankAccept', async function() {

	    	let error;
			try {
				await Credit.bankAccept(wrongAddress, rightTimestamp, rightAmount, {from: owner});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('bankAccept', async function() {

	    	let error;
			try {
				await Credit.bankAccept(rightAddress, wrongTimestamp, rightAmount, {from: owner});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('bankAccept', async function() {

	    	let error;
			try {
				await Credit.bankAccept(rightAddress, rightTimestamp, wrongAmount, {from: owner});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('bankDecline', async function() {

	    	let error;
			try {
				await Credit.bankDecline(wrongAddress, rightTimestamp, {from: owner});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('bankDecline', async function() {

	    	let error;
			try {
				await Credit.bankDecline(rightAddress, wrongTimestamp, {from: owner});
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('userAccept', async function() {

	    	let error;
			try {
				await Credit.userAccept(wrongTimestamp);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('userDelegateAccept', async function() {

	    	let error;
			try {
				await Credit.userDelegateAccept(wrongAddress, rightTimestamp);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('userDelegateAccept', async function() {

	    	let error;
			try {
				await Credit.userDelegateAccept(rightAddress, wrongTimestamp);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('userDecline', async function() {

	    	let error;
			try {
				await Credit.userDecline(wrongTimestamp);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('userDelegateDecline', async function() {

	    	let error;
			try {
				await Credit.userDelegateDecline(wrongAddress, rightTimestamp);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('userDelegateDecline', async function() {

	    	let error;
			try {
				await Credit.userDelegateDecline(rightAddress, wrongTimestamp);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('addUserDelegate', async function() {

	    	let error;
			try {
				await Credit.addUserDelegate(wrongAddress);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	    it('deleteUserDelegate', async function() {

	    	let error;
			try {
				await Credit.deleteUserDelegate(wrongAddress);
			} catch (err) {
				error = err;	
			}
			assert.instanceOf(error, Error);

	    });

	});


});

async function getGasCost(trans) {

    const gasUsed = trans.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(trans.tx);
    const gasPrice = tx.gasPrice;
    return gasUsed*gasPrice;
}