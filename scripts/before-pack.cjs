const { verify } = require('./verify-artifacts.cjs');
module.exports = async context => verify(context.packager.info.appDir);


