#!/usr/bin/env node

const city = require('./modules/city');
const cadastre = require('./modules/cadastre');
const chalk = require('chalk');

async function start() {

  const codeCommune = await city.selectCity();
  const parcelle = await cadastre.selectParcelle(codeCommune);
  cadastre.printParcelle(parcelle);
}

start();