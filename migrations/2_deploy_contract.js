const CreditContract = artifacts.require("Credit.sol");

module.exports = function(deployer) {
    deployer.deploy(CreditContract);
    console.log('Credit Contract deployed');
}