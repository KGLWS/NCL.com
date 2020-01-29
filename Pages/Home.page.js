require('../Utilities/CustomLocators.js');

const HomePage=function newHomePage(){

   // this.NCLtitle = $$('a[title = "Norwegian Cruise Line"]').get(0);
    this.cvText = element(by.xpath('//*[text()="Cruise Vacations"]'));
    this.exploreBtn = element(by.xpath('//*[@class="linkNav" and @title="Explore"]'));
    this.portsDrDwnBtn = element(by.xpath('//*[@class="linkItem" and @title="Ports"]'));
    this.shoreExrBtn = element(by.xpath('//*[@class="linkItem" and @title="Shore Excursions"]'));
};
module.exports=new HomePage();
