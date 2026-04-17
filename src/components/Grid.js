// Grid.js
export function initGrid() {
    const gridHTML = `
    <div class="ui grid container">
        <div class="four wide column"></div>
        <div class="four wide column"></div>
        <div class="four wide column"></div>
        <div class="four wide column"></div>
        <div class="four wide column"></div>
        <div class="four wide column"></div>
        <div class="four wide column"></div>
      <div class="four wide column"></div>
    </div>
`;

    document.body.innerHTML = gridHTML;
}   