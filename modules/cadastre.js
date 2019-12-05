const zlib = require('zlib');
const request = require('request');
const terminalLink = require('terminal-link');
const inquirer = require('inquirer');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
const chalk = require('chalk');

let sections = new Map();
let selectedSection = '';
let selectedParcelle = '';

function setInDoubleMapSection(parcelle) {
  const properties = parcelle.properties;
  parcelle.geometry.coordinates = parcelle.geometry.coordinates[0].map(point => [point[1], point[0]])

  let section = sections.get(properties.section);
  if (!section) {
    sections.set(properties.section, new Map());
    section = sections.get(properties.section);
  }
  section.set(properties.numero, parcelle);
}

const includes = (str1, str2) => {
  if (str1 === str2) return true;
  if (!str1 || !str2) return true;
  return str1.toLowerCase().includes(str2.toLowerCase());
}

const searchSection = async (_, search) => {
  return Array.from(sections.keys()).filter(section => includes(section, search));
}

const searchParcelle = async (_, search) => {
  return Array.from(sections.get(selectedSection).keys()).filter(section => section.startsWith(search));
}

async function getParcelles(codeCommune) {
  sections = new Map();
  const sectionsRes = await requestGzip(`https://cadastre.data.gouv.fr/bundler/cadastre-etalab/communes/${codeCommune}/geojson/parcelles`);
  sectionsRes.features.map(setInDoubleMapSection);
}

function requestGzip(url) {
  return new Promise((resolve, reject) => {
    request(url, {encoding: null}, function(err, response, body){
      zlib.gunzip(body, function(err, dezipped) {
        if (err) reject(err);
        resolve(JSON.parse(dezipped.toString()));
      });
    });
  });
}

exports.selectParcelle = async (codeCommune) => {
  await getParcelles(codeCommune);

  selectedSection = (await inquirer.prompt({
    type: 'autocomplete',
    name: 'section',
    message: 'Saisir une section dans la commune',
    source: searchSection
  })).section;

  selectedParcelle = (await inquirer.prompt({
    type: 'autocomplete',
    name: 'parcelle',
    message: 'Saisir un numero de parcelle',
    source: searchParcelle
  })).parcelle;

  return sections.get(selectedSection).get(selectedParcelle);
}

exports.printParcelle = (parcelle) => {
  const coords = parcelle.geometry.coordinates[0];
  const geoportailMap = `https://www.geoportail.gouv.fr/carte?c=${coords[1]},${coords[0]}&z=19&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&l1=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR.CV::GEOPORTAIL:OGC:WMTS(1)&l2=CADASTRALPARCELS.PARCELS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;
  const googleMap = `https://www.google.com/maps/search/${coords[0]},${coords[1]}`;
  console.log('📐 ' + chalk.yellow(parcelle.properties.contenance + ' m2'));
  console.log('📌 ' + chalk.yellow(coords[0] + ', ' + coords[1]));
  console.log('🗺  ' + chalk.blue(terminalLink('Geoportail', geoportailMap)));
  console.log('🗺  ' + chalk.blue(terminalLink('Google Maps', googleMap)));
}