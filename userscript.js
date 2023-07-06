// ==UserScript==
// @name ClearCost
// @grant GM_addStyle
// @require https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js
// @run-at document-idle
// ==/UserScript==

// Sanity check to prevent weird infinite loops
const MAX_PRICE_TAGS = 9000;

class ClearCost {
  constructor() {
	this.addStyle(`
	  .clearcost.low-opacity {
		//opacity: 0.4;
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
	// liquids are conversion factors to a liter
	this.conversionFactors = {
	  'fl oz': 0.0295735,
	  'pt': 0.473176,
	  'qt': 0.946353,
	  'gallon': 3.78541,
	  'liter': 1,
	  'oz': 0.0625,
	  'gram': 0.00220462,
	  'kg': 2.20462,
	  'lb': 1,
	  'pound': 1,
	  'each': 1,
	};
	this.unitSynonyms = {
		'pound': 'lb',
		'gallon': 'gal',
		'pnt': 'pt',
		'quart': 'qt',
		'ounce': 'oz',
		'gram': 'g',
		'kilogram': 'kg',
		'cent': '¢',
		'cents': '¢',
		'dollar': '$',
		'dollars': '$',
		'lter': 'liter',
		'ltr': 'liter',
		'count': 'each',
		'ct': 'each',
		'cnt': 'each',
	};
	this.unitTypes = {
	  'fl oz': 'liquid',
	  'pt': 'liquid',
	  'qt': 'liquid',
	  'gallon': 'liquid',
	  'liter': 'liquid',
	  'oz': 'solid', 
	  'gram': 'solid',
	  'kg': 'solid',
	  'lb': 'solid',
	  'pound': 'solid',
	  'each': 'count',
	};
	this.num_tags = 0;
  }

  addStyle(css) {
	const style = document.createElement('style');
	style.type = 'text/css';
	style.textContent = css;
	document.head.appendChild(style);
  }

  convertTo(price, unit, quantity) {
	const factor = this.conversionFactors[unit.toLowerCase()];
	if (!factor) throw new Error(`No conversion factor for unit ${unit}`);
	const pricePerUnit = (price / quantity) / factor;
	return pricePerUnit.toFixed(2);
  }

  addPriceTag(element, pricePerUnit, originalUnit) {
	if (this.num_tags >= MAX_PRICE_TAGS) {
		console.warn('Too many price tags');
		return;
	}

	if (this.hasPriceTag(element)) {
		console.warn('Already has price tag', element);
		return;
	}
	const unitType = this.unitTypes[originalUnit];
	const finalUnit = (unitType === 'liquid') ? 'liter' : (unitType === 'solid') ? 'lb' : 'each';
	const priceTag = document.createElement('div');
	priceTag.textContent = ` ($${pricePerUnit}/${finalUnit})`;
	priceTag.classList.add('clearcost', 'chip', 'blue', 'animate__animated', 'animate__fadeIn');
	if (originalUnit === finalUnit) {
	  priceTag.classList.add('low-opacity');
	}
	element.parentNode.insertBefore(priceTag, element.nextSibling);
	console.debug('Added a price tag to ', element);
	this.num_tags++;
  }

  countPriceTags() {
	this.num_tags = document.querySelectorAll('.clearcost').length;
	return this.num_tags;
  }

  findPricePerUnit(text) {
	// Determine if anywhere in the text there is an obvious price and an obvious unit.

	// First, find the price
	const priceRegex = /\$\s*(\d+(\.\d+)?)/;
	const priceMatch = text.match(priceRegex);
	if (!priceMatch) {
		return null;
	}

	// Next, find the unit and its quantity
	const unitRegex = /(\d+(\.\d+)?)\s*(fl oz|oz|ounce|pi?n?t|qr?t|gal|gall?on|li?ter|gra?m|kg|lb|pound|count|ct|cnt|each)s?\b/i;
	const unitMatch = text.match(unitRegex);
	if (!unitMatch) {
		return null;
	}

	// Handle synonyms
	let unit = unitMatch[3].toLowerCase();
	if (this.unitSynonyms[unit]) {
		unit = this.unitSynonyms[unit];
	}

	// Ensure the price and unit are both more than 0
	const price = parseFloat(priceMatch[1]);
	const quantity = parseFloat(unitMatch[1]); 
	if (price <= 0 || quantity <= 0 || !this.conversionFactors[unit]) {
		return null;
	}

	return { price: price, quantity: quantity, unit: unit };
  }

  getPricePerUnit(text) {
	const regex = /\$?(\d+(\.\d+)?)\s*(c|cents?|¢)?\s*(per|[/\\])\s*(fl oz|oz|ounce|pi?n?t|qr?t|gal|gall?on|li?ter|gra?m|kg|lb|pound|count|ct|cnt|each)/i;
	const match = text.match(regex);
	if (!match) {
		return null;
	}
	return { match: match[0], price: match[1], priceunit: match[3] || 'dollars', quantity: 1, unit: match[5] };
  }

  parsePriceAndUnit(text) {
	let match = this.getPricePerUnit(text);

	// Ensure the price per unit is the entire text, not a piece of the text
	if (!match || match['match'] !== text) {
		return null;
	}

	let price = parseFloat(match['price']);
	let priceunit = (match['priceunit']).toLowerCase();
	let quantity = parseFloat(match['quantity']);
	let unit = match['unit'].toLowerCase();

	// Convert synonyms to standard units
	if (this.unitSynonyms[priceunit]) {
		priceunit = this.unitSynonyms[priceunit];
	}

	// Convert cents to dollars
	if (priceunit === 'c' || priceunit === 'cents' || priceunit === '¢') {
		price /= 100;
		priceunit = 'dollar';
	}
	return { price: price, quantity: quantity, unit: unit };
  }

  hasPriceTag(element) {
	// Determine if this element, or any children or parent elements, already have a price tag.
	if (!element || !element.classList) {
		return false;
	}
	if (element.classList.contains('clearcost')) {
		return true;
	}
	for (let i = 0; i < element.childNodes.length; i++) {
		if (this.hasPriceTag(element.childNodes[i])) {
			return true;
		}
	}
	let parent = element.parentNode;
	while (parent != null) {
		if (parent.classList && parent.classList.contains('clearcost')) {
			return true;
		}
		parent = parent.parentNode;
	}
	return false;
  }

  processChildren(element) {
	for (let child of element.childNodes) {
	  if (child.nodeType === Node.ELEMENT_NODE) {
		const priceAndUnit = this.parsePriceAndUnit(child.textContent);
		if (priceAndUnit) {
		  try {
			const pricePerUnit = this.convertTo(priceAndUnit.price, priceAndUnit.unit, priceAndUnit.quantity);
			this.addPriceTag(child, pricePerUnit, priceAndUnit.unit);
			return true; // Return true as soon as a price tag is successfully added
		  } catch (error) {
			console.error(`Failed to process child element`, child, error);
		  }
		}
	  }
	}
	return false;
  }

  processElement(element) {
	// First check if the element, its children, or its parents already have a price tag
	if (this.hasPriceTag(element)) {
	  return;
	}
	
	// If no price tag, try finding a price per unit in this element first
	const priceAndUnit = this.findPricePerUnit(element.textContent);
	if (priceAndUnit) {
	  try {
		const pricePerUnit = this.convertTo(priceAndUnit.price, priceAndUnit.unit, priceAndUnit.quantity);

		// find the node that contains the price text and add the price tag next to it
		const priceNode = this.findPriceNode(element, priceAndUnit.price);
		if (priceNode) {
		  this.addPriceTag(priceNode, pricePerUnit, priceAndUnit.unit);
		} else {
		  // fallback to adding the price tag next to the current element
		  this.addPriceTag(element, pricePerUnit, priceAndUnit.unit);
		}
		return;
	  } catch (error) {
		console.error(`Failed to process element`, element, error);
	  }
	}

	// If no price per unit was found in this element, process the children
	this.processChildren(element);
  }

  // New method to find the node that contains the price text
  findPriceNode(element, price) {
	if (element.nodeType === Node.TEXT_NODE && element.textContent.includes(price)) {
	  return element;
	} else {
	  for (let i = 0; i < element.childNodes.length; i++) {
		const result = this.findPriceNode(element.childNodes[i], price);
		if (result) {
		  return result;
		}
	  }
	}
	return null;
  }

  scanPage() {
	// Reset the count (because the page may have mutated)
	this.countPriceTags();

	if (this.num_tags >= MAX_PRICE_TAGS) {
		console.log('ClearCost: Too many price tags, not scanning page');
		return;
	}


	console.log('Scanning the page for prices...');

	const elements = document.querySelectorAll('body *:not(:empty)');
	for (let i = 0; i < elements.length; i++) {
	  window.requestAnimationFrame(() => this.processElement(elements[i]));
	}
  }

  watchPage() {
	// Scan the page initially, and also listen for future page changes
	this.scanPage();

	// Listen for page changes, and run scanPage again
	const observer = new MutationObserver(() => this.scanPage());
	observer.observe(document.body, { childList: true, subtree: true });
  }
}

clearCost = new ClearCost();
clearCost.watchPage();