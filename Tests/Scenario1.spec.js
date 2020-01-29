require('../Utilities/CustomLocators.js');
const HomePage = require('../Pages/Home.page.js');
const Base = require('../Utilities/Base.js');
const NCLData = require('../TestData/NCLData.json');
const PortPage = require('../Pages/PortPage.page');

describe('Scenario 1: Guest explores Ports of Departure', () => {

    beforeAll(function () {
        Base.navigateToHome();
    });

    it('1.Given: a guest & I am on HomePage', () => {
        browser.getCurrentUrl().then((homeUrl) => {
            console.log(homeUrl)
            expect(homeUrl).toEqual(NCLData.URLs.homeUrl);
            HomePage.cvText.getText().then((a) => {
                console.log(a)
            });
        });
    });

    it('2.And: I navigated to "Ports" page', () => {
        HomePage.exploreBtn.click();
        browser.sleep(1000).then(() => {
            HomePage.portsDrDwnBtn.click();
        });
    });

    it('3.When: I search for "Honolulu" port', () => {
        PortPage.searchBar.sendKeys('Honolulu, OAHU');
        PortPage.searchBar.sendKeys(protractor.Key.ENTER);
        browser.sleep(3000);
    });

    it('4.Then: Map zoomed to show selected ports', () => {
        browser.sleep(2000).then(() => {
            expect(PortPage.honoluluZoomed.getLocation()).toEqual(jasmine.objectContaining({
                x: 0,
                y: 484
            }));
        });
        browser.sleep(5000);
    });
});