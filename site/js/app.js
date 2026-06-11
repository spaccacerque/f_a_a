// EVcar — catalogo e carosello guidati da data/vehicles.json
(async function () {
  const res = await fetch('data/vehicles.json');
  const data = await res.json();
  const DISCOUNT = (data.discountVsCompetitorPct ?? 5) / 100;

  // Prezzo mostrato: priceEur se presente (es. listino nextora.it);
  // altrimenti prezzo concorrente scontato del 5%, arrotondato ai 10 € inferiori;
  // altrimenti "su richiesta".
  function priceInfo(v) {
    if (typeof v.priceEur === 'number') {
      return { label: fmt(v.priceEur), note: 'chiavi in mano, import incluso' };
    }
    if (typeof v.competitorPriceEur === 'number') {
      const ours = Math.floor((v.competitorPriceEur * (1 - DISCOUNT)) / 10) * 10;
      return { label: fmt(ours), strike: fmt(v.competitorPriceEur), note: `-${data.discountVsCompetitorPct}% vs concorrenza` };
    }
    return { label: 'Su richiesta', note: 'preventivo in 24 ore' };
  }

  function fmt(n) {
    return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  }

  function priceValue(v) {
    if (typeof v.priceEur === 'number') return v.priceEur;
    if (typeof v.competitorPriceEur === 'number') return v.competitorPriceEur * (1 - DISCOUNT);
    return Infinity;
  }

  function cardHtml(v) {
    const p = priceInfo(v);
    const img = v.image
      ? `<img src="${v.image}" alt="${v.brand} ${v.model}" loading="lazy" />`
      : `<div class="placeholder">${v.brand}<br />${v.model}</div>`;
    return `
      <article class="car-card">
        <div class="car-img">${img}${v.badge ? `<span class="car-badge">${v.badge}</span>` : ''}</div>
        <div class="car-body">
          <div class="car-title">${v.brand} ${v.model}</div>
          <div class="car-version">${v.version ?? ''} · ${v.year ?? ''}</div>
          <div class="car-specs">
            ${v.rangeKm ? `<span>🔋 ${v.rangeKm} km</span>` : ''}
            ${v.batteryKwh ? `<span>${v.batteryKwh} kWh</span>` : ''}
            ${v.powerKw ? `<span>${v.powerKw} kW</span>` : ''}
            ${v.drive ? `<span>${v.drive}</span>` : ''}
            ${v.seats ? `<span>${v.seats} posti</span>` : ''}
          </div>
          <div class="car-price-row">
            <div class="car-price">
              ${p.strike ? `<span class="strike">${p.strike}</span>` : ''}${p.label}
              <small>${p.note}</small>
            </div>
            <a class="car-cta" href="#preventivo" data-car="${v.brand} ${v.model} ${v.version ?? ''}">Preventivo →</a>
          </div>
        </div>
      </article>`;
  }

  // ----- Carosello (featured)
  const carousel = document.getElementById('carousel');
  const featured = data.vehicles.filter((v) => v.featured);
  carousel.innerHTML = (featured.length ? featured : data.vehicles).map(cardHtml).join('');
  document.getElementById('carPrev').onclick = () => carousel.scrollBy({ left: -320 });
  document.getElementById('carNext').onclick = () => carousel.scrollBy({ left: 320 });

  // ----- Filtri catalogo
  const brandSel = document.getElementById('filterBrand');
  const bodySel = document.getElementById('filterBody');
  const sortSel = document.getElementById('filterSort');
  for (const b of [...new Set(data.vehicles.map((v) => v.brand))].sort()) {
    brandSel.insertAdjacentHTML('beforeend', `<option>${b}</option>`);
  }
  for (const b of [...new Set(data.vehicles.map((v) => v.bodyType).filter(Boolean))].sort()) {
    bodySel.insertAdjacentHTML('beforeend', `<option>${b}</option>`);
  }

  const catalog = document.getElementById('catalog');
  function renderCatalog() {
    let list = data.vehicles.filter(
      (v) => (!brandSel.value || v.brand === brandSel.value) && (!bodySel.value || v.bodyType === bodySel.value),
    );
    const sort = sortSel.value;
    list.sort((a, b) =>
      sort === 'price-desc' ? priceValue(b) - priceValue(a)
      : sort === 'range-desc' ? (b.rangeKm ?? 0) - (a.rangeKm ?? 0)
      : priceValue(a) - priceValue(b),
    );
    catalog.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : '<p class="catalog-empty">Nessuna auto corrisponde ai filtri.</p>';
    bindQuoteLinks();
  }
  brandSel.onchange = bodySel.onchange = sortSel.onchange = renderCatalog;
  renderCatalog();

  // ----- Form preventivo
  const quoteCar = document.getElementById('quoteCar');
  for (const v of data.vehicles) {
    quoteCar.insertAdjacentHTML('beforeend', `<option>${v.brand} ${v.model} ${v.version ?? ''}</option>`);
  }
  function bindQuoteLinks() {
    document.querySelectorAll('.car-cta').forEach((a) => {
      a.onclick = () => { quoteCar.value = a.dataset.car.trim(); };
    });
  }
  bindQuoteLinks();

  document.getElementById('quoteForm').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    // Invio via mailto finché non è collegato un backend (vedi site/README.md).
    const body = encodeURIComponent(
      `Nome: ${f.get('nome')}\nEmail: ${f.get('email')}\nTelefono: ${f.get('telefono') || '-'}\nAuto: ${f.get('auto') || '-'}\n\n${f.get('messaggio') || ''}`,
    );
    window.location.href = `mailto:info@evcar.it?subject=${encodeURIComponent('Richiesta preventivo EVcar')}&body=${body}`;
    document.getElementById('formFeedback').textContent =
      'Si è aperto il tuo client di posta: invia l\'email per completare la richiesta. Ti risponderemo entro 24 ore.';
  };
})();
