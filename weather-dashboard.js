document.addEventListener('DOMContentLoaded', function() {
    // API Key
    const API_KEY = '8631cd43fec3f84ff00436c3e40b639f';

    // Elements
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const background = document.getElementById('background');

    // Weather data elements
    const locationElement = document.getElementById('location');
    const dateElement = document.getElementById('date');
    const weatherIcon = document.getElementById('weatherIcon');
    const temperatureElement = document.getElementById('temperature');
    const descriptionElement = document.getElementById('description');
    const windSpeedElement = document.getElementById('windSpeed');
    const humidityElement = document.getElementById('humidity');
    const maxTempElement = document.getElementById('maxTemp');
    const minTempElement = document.getElementById('minTemp');
    const sunriseElement = document.getElementById('sunrise');
    const sunsetElement = document.getElementById('sunset');

    // Background images for different weather conditions
    const backgroundImages = {
        'default': 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1700&q=80',
        'sunny': 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1700&q=80',
        'cloudy': 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1700&q=80',
        'rainy': 'https://images.unsplash.com/photo-1433863448220-9aaa1fc9559c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1700&q=80',
        'snowy': 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1700&q=80'
    };

    // Initialize with default city and load cities
    updateDate();
    fetchWeatherData('Seattle');
    fetchCitiesWeather();

    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    function handleSearch() {
        const city = searchInput.value.trim();
        if (city) {
            fetchWeatherData(city);
        }
    }

    async function fetchWeatherData(city) {
        showLoader();
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
            if (!response.ok) {
                throw new Error('City not found');
            }
            const data = await response.json();
            updateWeatherUI(city, data);
            hideLoader();
        } catch (error) {
            console.error('Error fetching weather data:', error);
            showError();
        }
    }

    async function fetchCitiesWeather() {
        const cities = ['Rajkot', 'New York', 'Tokyo', 'London'];
        const cityCards = document.querySelectorAll('.city-card');

        cities.forEach(async (city, index) => {
            try {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
                if (!response.ok) {
                    throw new Error('City not found');
                }
                const data = await response.json();
                updateCityCard(cityCards[index], data);
            } catch (error) {
                console.error(`Error fetching weather for ${city}:`, error);
                updateCityCard(cityCards[index], null);
            }
        });
    }

    function updateCityCard(card, data) {
        const tempElement = card.querySelector('.city-temp');
        const descElement = card.querySelector('.city-desc');
        const iconElement = card.querySelector('.city-icon');

        if (data) {
            const temp = Math.round(data.main.temp);
            const desc = data.weather[0].description;
            tempElement.textContent = `${temp}°C`;
            descElement.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);

            // Update icon
            const iconClass = getWeatherIconClass(data.weather[0].main);
            iconElement.className = `fas ${iconClass} city-icon`;
        } else {
            tempElement.textContent = '--°C';
            descElement.textContent = 'Error loading';
            iconElement.className = 'fas fa-exclamation-triangle city-icon';
        }
    }

    function getWeatherIconClass(condition) {
        condition = condition.toLowerCase();
        if (condition.includes('clear')) return 'fa-sun';
        if (condition.includes('cloud')) return 'fa-cloud';
        if (condition.includes('rain')) return 'fa-cloud-rain';
        if (condition.includes('snow')) return 'fa-snowflake';
        if (condition.includes('thunderstorm')) return 'fa-bolt';
        if (condition.includes('drizzle')) return 'fa-cloud-rain';
        if (condition.includes('mist') || condition.includes('fog')) return 'fa-smog';
        return 'fa-cloud';
    }

    function updateWeatherUI(city, data) {
        // Update location
        locationElement.textContent = `${data.name}, ${data.sys.country}`;

        // Update temperature and description
        const temp = Math.round(data.main.temp);
        temperatureElement.textContent = `${temp}°C`;
        descriptionElement.textContent = data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1);

        // Update weather icon based on conditions
        updateWeatherIcon(data.weather[0].main);

        // Update background based on weather condition
        updateBackground(data.weather[0].main);

        // Update weather details
        windSpeedElement.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
        humidityElement.textContent = `${data.main.humidity}%`;
        maxTempElement.textContent = `${Math.round(data.main.temp_max)}°C`;
        minTempElement.textContent = `${Math.round(data.main.temp_min)}°C`;

        // Convert times to readable format
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        sunriseElement.textContent = sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        sunsetElement.textContent = sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // Update forecast cards
        updateForecast(city);
    }

    function updateWeatherIcon(condition) {
        const iconClass = getWeatherIconClass(condition);
        weatherIcon.className = `fas ${iconClass} weather-icon`;
    }

    function updateBackground(condition) {
        // Change background based on weather condition
        condition = condition.toLowerCase();

        if (condition.includes('clear')) {
            background.style.backgroundImage = "url('" + backgroundImages.sunny + "')";
        } else if (condition.includes('cloud')) {
            background.style.backgroundImage = "url('" + backgroundImages.cloudy + "')";
        } else if (condition.includes('rain')) {
            background.style.backgroundImage = "url('" + backgroundImages.rainy + "')";
        } else if (condition.includes('snow')) {
            background.style.backgroundImage = "url('" + backgroundImages.snowy + "')";
        } else {
            background.style.backgroundImage = "url('" + backgroundImages.default + "')";
        }
    }

    async function updateForecast(city) {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
            if (!response.ok) {
                throw new Error('Forecast not available');
            }
            const data = await response.json();

            const forecastCards = document.querySelectorAll('.forecast-card');
            const dates = ['Today', 'Tomorrow', 'Day after'];

            // Group forecast by day
            const dailyForecasts = {};
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000).toDateString();
                if (!dailyForecasts[date]) {
                    dailyForecasts[date] = [];
                }
                dailyForecasts[date].push(item);
            });

            const forecastDays = Object.keys(dailyForecasts).slice(0, 3);

            forecastCards.forEach((card, index) => {
                if (forecastDays[index]) {
                    const dayData = dailyForecasts[forecastDays[index]];
                    const avgTemp = dayData.reduce((sum, item) => sum + item.main.temp, 0) / dayData.length;
                    const mainCondition = dayData[0].weather[0].main;

                    card.querySelector('.forecast-date').textContent = dates[index];
                    card.querySelector('.forecast-temp').textContent = `${Math.round(avgTemp)}°C`;
                    card.querySelector('.forecast-desc').textContent = dayData[0].weather[0].description.charAt(0).toUpperCase() + dayData[0].weather[0].description.slice(1);

                    const iconClass = getWeatherIconClass(mainCondition);
                    card.querySelector('.forecast-icon').className = `fas ${iconClass} forecast-icon`;
                }
            });
        } catch (error) {
            console.error('Error fetching forecast:', error);
            // Fallback to mock data if forecast fails
            const forecastCards = document.querySelectorAll('.forecast-card');
            forecastCards.forEach(card => {
                card.querySelector('.forecast-temp').textContent = '--°C';
                card.querySelector('.forecast-desc').textContent = 'Forecast unavailable';
            });
        }
    }

    function updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString('en-US', options);
    }

    function showLoader() {
        loader.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function hideLoader() {
        loader.style.display = 'none';
    }

    function showError() {
        loader.style.display = 'none';
        errorMessage.style.display = 'block';
    }
});
