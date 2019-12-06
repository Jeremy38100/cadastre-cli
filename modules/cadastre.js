const zlib = require('zlib');
const request = require('request');
const terminalLink = require('terminal-link');
const inquirer = require('inquirer');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
const chalk = require('chalk');

let sections = new Map();
let selectedSection = '';
let selectedParcelle = '';

function extractBetweenChars(str, char1, char2) {
  return mySubString = str.substring(
    str.lastIndexOf(char1) + 1,
    str.lastIndexOf(char2));
}

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
  if (search === '?') return ['?'];
  const result = Array.from(sections.keys()).filter(section => includes(section, search));
  if (!search) return ['?', ...result];
  return result;
}

const searchParcelleSectionUnknown = (search) => {
  return Array.from(sections.values()).map(section => {
    return Array.from(section.values())
      .filter(parcelle => parcelle.properties.numero == search)
      .map(parcelle => {
        const properties = parcelle.properties;
        return `${properties.numero} (${properties.section}) - ${properties.contenance} m²`;
      })
   }).flat();
}

const searchParcelle = async (_, search) => {
  if (!search) return [];
  if (selectedSection === '?') {
    return searchParcelleSectionUnknown(search);
  }
  return Array.from(sections.get(selectedSection).keys()).filter(section => section.startsWith(search));
}

const getSelectedParcelle = () => {
  if (selectedSection !== '?') return sections.get(selectedSection).get(selectedParcelle);
  // selectedParcelle : _numeroParcelle_ (_numeroSection_) _superficie_ m²
  const parcelle = selectedParcelle.split(' ')[0];
  const section = extractBetweenChars(selectedParcelle, '(', ')');
  return sections.get(section).get(parcelle);
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
    message: 'Saisir une section dans la commune (ou ?)',
    source: searchSection
  })).section;
  console.log(selectedSection);

  selectedParcelle = (await inquirer.prompt({
    type: 'autocomplete',
    name: 'parcelle',
    message: 'Saisir un numero de parcelle',
    source: searchParcelle
  })).parcelle;

  return getSelectedParcelle();
}

exports.printParcelle = (parcelle) => {
  const coords = parcelle.geometry.coordinates[0];
  const geoportailMap = `https://www.geoportail.gouv.fr/carte?c=${coords[1]},${coords[0]}&z=19&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&l1=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR.CV::GEOPORTAIL:OGC:WMTS(1)&l2=CADASTRALPARCELS.PARCELS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;
  const googleMap = `https://www.google.com/maps/search/${coords[0]},${coords[1]}`;
  console.log('📐 ' + chalk.yellow(parcelle.properties.contenance + ' m²'));
  console.log('📌 ' + chalk.yellow(coords[0] + ', ' + coords[1]));
  console.log('🗺  ' + chalk.blue(terminalLink('Geoportail', geoportailMap)));
  console.log('🗺  ' + chalk.blue(terminalLink('Google Maps', googleMap)));
}