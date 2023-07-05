// ==UserScript==
// @name ClearCost
// @grant GM_addStyle
// @require https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js
// @run-at document-idle
// ==/UserScript==

class ClearCost {
  constructor() {
    this.addStyle(`
      .clearcost.low-opacity {
        opacity: 0.4;
      }
      .clearcost.chip {
        display: inline-block;
        height: 32px;
        font-size: 13px;
        font-weight: 500;
        line-height: 32px;
        padding: 0 12px;
        border-radius: 16px;
        background-color: #e4e4e4;
        margin-right: 8px;
      }
    `);
    this.conversionFactors = {
      'pt': 2,
      'qt': 1,
      'gallon': 0.120095,
      'liter': 2.20462,
      'oz': 0.0625,
      'gram': 0.00220462,
      'kg': 2.20462,
      'lb': 1
    };
    this.unitTypes = {
      'pt': 'liquid',
      'qt': 'liquid',
      'gallon': 'liquid',
      'liter': 'liquid',
      'oz': 'solid',
      'gram': 'solid',
      'kg': 'solid',
      'lb': 'solid'
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

  addPriceTag(element, pricePerUnit, originalUnit) {
    const unitType = this.unitTypes[originalUnit];
    const finalUnit = (unitType === 'liquid') ? 'liter' : 'lb';
    const priceTag = document.createElement('div');
    priceTag.textContent = ` (${pricePerUnit}/${finalUnit})`;
    priceTag.classList.add('clearcost', 'chip', 'blue', 'animate__animated', 'animate__fadeIn');
    if (originalUnit === finalUnit) {
      priceTag.classList.add('low-opacity');
    }
    element.parentNode.insertBefore(priceTag, element.nextSibling);
  }

  parsePriceAndUnit(text) {
    const regex = /\$?(\d+(\.\d+)?)\s*(c|cents?|¢)?\s*(per|[/\\])\s*(oz|pt|qt|gallon|liter|gram|kg|lb)/i;
    const match = text.match(regex);
    if (match && match[0] === text) {
      let price = parseFloat(match[1]);
	  let priceunit = (match[3] || 'dollars').toLowerCase();
      let unit = match[5].toLowerCase();
      // Convert cents to dollars
      if (priceunit === 'c' || priceunit === 'cents' || priceunit === '¢') {
        price /= 100;
        priceunit = 'dollar';
      }
      return { price: price, unit: unit };
    } else {
      return null;
    }
  }

  processElement(element) {
    const priceAndUnit = this.parsePriceAndUnit(element.textContent);
    if (priceAndUnit) {
      try {
        const pricePerUnit = this.convertTo(priceAndUnit.price, priceAndUnit.unit);
        this.addPriceTag(element, pricePerUnit, priceAndUnit.unit);
      } catch (error) {
        console.error(`Failed to process element`, element, error);
      }
    }
  }

  scanPage() {
    const elements = document.querySelectorAll('body *:not(:empty)');
    for (let i = 0; i < elements.length; i++) {
      window.requestAnimationFrame(() => this.processElement(elements[i]));
    }
  }
}

new ClearCost().scanPage();
