module.exports = {

  networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 7545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 7545,         // <-- If you change this, also set the port option in .solcover.js.
    },
  },
  mocha: {  },
  compilers: {
    solc: {
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: true,
         runs: 200
       },
      }
    }
  },
  plugins: ["solidity-coverage"]

}
