const backdrop = document.querySelector('.backdrop');
const sideDrawer = document.querySelector('.mobile-nav');
const menuToggle = document.querySelector('#side-menu-toggle');
const darkModeToggle = document.querySelector('#toggle');

function backdropClickHandler() {
    backdrop.style.display = 'none';
    sideDrawer.classList.remove('open');
}

function menuToggleClickHandler() {
    backdrop.style.display = 'block';
    sideDrawer.classList.add('open');
}

function modeToggle() {
    let theme = document.getElementById('theme');
    if (darkModeToggle.checked == false) {
        localStorage.setItem('theme', 'theme-light');
        theme.setAttribute('href', 'none');
    } else {
        localStorage.setItem('theme', 'theme-dark');
        theme.setAttribute('href', '/css/darkstyle.css');
    }
}

backdrop.addEventListener('click', backdropClickHandler);
menuToggle.addEventListener('click', menuToggleClickHandler);
darkModeToggle.addEventListener('click', modeToggle);

if (localStorage.getItem('theme') == 'theme-dark') {
    darkModeToggle.checked = true;
    document.getElementById('theme').setAttribute('href', '/css/darkstyle.css');
}

function noImage(el) {
    el.src = "./no-image.jpg";
    el.style.height = "100%";
}