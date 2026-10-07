const genreModel = require("../model/genreModel")

const getGenres = () => genreModel.getGenresData();

module.exports = { getGenres }
