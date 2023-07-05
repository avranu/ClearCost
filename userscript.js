// ==UserScript==
// @name ClearCost
// @grant GM_addStyle
// @require https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js
// @run-at document-idle
// ==/UserScript==

class ClearCost {
  constructor() {
    GM_addStyle("@import url('https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css')");
    GM_addStyle("@import url('https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css')");

    this.addStyle(".low-opacity { opacity: 0.3; }");
    this.conversionFactors = {
      'oz': 16,
      'pt': 2,
      'qt': 1,
      'gallon': 0.120095,
      'liter': 2.20462,
      'gram': 0.00220462,
      'kg': 2.20462,
      'lb': 1
    };
  }

  addStyle(css) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  convertTo(price, unit) {
    const factor = this.conversionFactors[unit.toLowerCase()];
    if (!factor) throw new Error(`No conversion factor for unit ${unit}`);
    const pricePerUnit = price / factor;
    return pricePerUnit.toFixed(2);
  }

  addPriceTag(element, pricePerLb, originalUnit) {
    const priceTag = document.createElement('div');
    priceTag.textContent = ` (${pricePerLb}/lb)`;
    priceTag.classList.add('chip', 'blue', 'animate__animated', 'animate__fadeIn');
    if (originalUnit === 'lb') {
      priceTag.classList.add('low-opacity');
    }
    element.parentNode.insertBefore(priceTag, element.nextSibling);
  }

  parsePriceAndUnit(text) {
    const regex = /\$?(\d+(\.\d+)?)\s*(per)?\s*(oz|pt|qt|gallon|liter|gram|kg|lb)/i;
    const match = text.match(regex);
    if (match && match[0] === text) { // check if the element's text content exactly matches the price and unit format
      return { price: parseFloat(match[1]), unit: match[4].toLowerCase() };
    } else {
      return null;
    }
  }

  processElement(element) {
    const priceAndUnit = this.parsePriceAndUnit(element.textContent);
    if (priceAndUnit) {
      try {
        const pricePerLb = this.convertTo(priceAndUnit.price, priceAndUnit.unit);
        this.addPriceTag(element, pricePerLb, priceAndUnit.unit);
      } catch (error) {
        console.error(`Failed to process element`, element, error);
      }
    }
 }

  scanPage() {
    const elements = document.querySelectorAll('body *:not(:empty)'); // updated the selector to only select non-empty elements
    for (let i = 0; i < elements.length; i++) {
      window.requestAnimationFrame(() => this.processElement(elements[i]));
    }
  }
}

//new ClearCost().scanPage();
