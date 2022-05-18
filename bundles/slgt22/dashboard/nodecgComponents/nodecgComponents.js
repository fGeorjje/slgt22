window.onload = () => {
    const buttons = document.querySelectorAll('button');
    for (let button of buttons) {
        if (!button.hasAttribute('noRipple')) button.addEventListener('click', createRipple)
    }

    const inputs = document.querySelectorAll('input');
    for (let input of inputs) {
        input.setAttribute('placeholder', ' ');
        input.setAttribute('autocomplete', 'off')
        if (input.type === 'range') input.addEventListener('input', updateSlider); input.style.setProperty('--slider-value', `${(input.value - input.min) / (input.max - input.min) * 100}%`);
    }

    const selects = document.querySelectorAll('select');
    for (let select of selects) {
        select.setAttribute('placeholder', ' ');
        select.setAttribute('autocomplete', 'off')
    }
}

function createRipple(event) {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
    circle.style.pointerEvents = 'none';
    circle.classList.add("ripple");
    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple)
        ripple.remove();
    button.appendChild(circle);
}

function updateSlider() { this.style.setProperty('--slider-value', `${(this.value - this.min) / (this.max - this.min) * 100}%`) }