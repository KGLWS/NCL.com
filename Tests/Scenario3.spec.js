require('../Utilities/CustomLocators.js');
const HomePage = require('../Pages/Home.page.js');
const Base = require('../Utilities/Base.js');
const NCLData = require('../TestData/NCLData.json');
const ShoreExcursion = require('../Pages/ShoreExcursion.page.js');

describe('Scenario 3: Guest filters shore excursions results using price range', () => {
    beforeAll(function () {
        Base.navigateToHome();
    });

    it('1.Given a GUEST: And I am on Homepage', () => {
        browser.getCurrentUrl().then((homeUrl) => {
            expect(homeUrl).toEqual(NCLData.URLs.homeUrl);
        });
    });

    it('2.And: I navigate to "Shore Excursion" page', () => {
        HomePage.exploreBtn.click();
        browser.sleep(1000)
        HomePage.shoreExrBtn.click();
    });

    it('3.And: I click "Find Excursions" button', () => {
        ShoreExcursion.findExcursionBtn.click();
    });

    it('4.And: Shore Excursion page is present', () => {
        ShoreExcursion.shoreExcrTitle.getText().then((title) => {
            expect(title).toBe('Shore Excursions');
        });
    });

    it('5.When: Price range is filtered to "0-$30"', () => {
        browser.actions().mouseDown(ShoreExcursion.priceRange2).perform();
        // browser.sleep(5000);
        browser.actions().mouseUp(ShoreExcursion.priceRange30).perform();
        //browser.sleep(5000);
    });

    it('6.Then: Only shore excursions within range are displayed', () => {
        ShoreExcursion.adultPriceRange.getText().then((priceRange) => {
            var price;
            for (let i = 0; i < priceRange.length; i++) {
                price = priceRange[i].slice(13, 16);
            }
            var numPrice = price;

            browser.sleep(3000).then(() => {
                for (let j = 0; j < numPrice.length; j++) {
                    expect(numPrice[j]).toBeGreaterThan(0);
                    expect(numPrice[j]).toBeLessThan(30);
                }
            })
        });
    });
});