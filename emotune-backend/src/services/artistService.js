const artistModel = require("../model/artistModel")

let getArtists = () => {
    return artistModel.getArtistsData();
}

module.exports = {
    getArtists: getArtists,
}
