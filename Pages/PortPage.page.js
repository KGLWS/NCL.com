const PortPage = function newPortPage(){
    this.searchBar=$('#searchbar');
    this.honoluluZoomed = element(by.xpath('//*[@class="map-label" and text()="Honolulu"]'));
}
module.exports= new PortPage();