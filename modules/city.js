const rp = require('request-promise');
const inquirer = require('inquirer');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const CITY_URL = 'https://api-adresse.data.gouv.fr/search/?type=municipality'; // doc: https://geo.api.gouv.fr/adresse

const cities = new Map();

// return "name (postal-code)"
const searchCity = async (_, search) => {
  try {
    return JSON.parse(await rp.get(CITY_URL + '&q=' + search))
      .features.map(city => {
        const id = `${city.properties.postcode} - ${city.properties.name}`
        if (!cities.get(id)) cities.set(id, city);
        return id;
      });
  } catch (e) {
    return [];
  }
}

exports.selectCity = async () => {
  const input = await inquirer.prompt({
    type: 'autocomplete',
    name: 'city',
    message: 'Saisir une commune (nom ou code-postal)',
    source: searchCity
  });
  return cities.get(input.city).properties.id;
}