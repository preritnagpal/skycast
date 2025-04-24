// Windy API Map Initialization

const options = {
    key: 'M8Eacx0Eci30AeTd1y0eZTLBlaxAfN91', //  Windy API key
    lat: 20.5937, // Default latitude for India
    lon: 78.9629, // Default longitude for India
    zoom: 5, // Default zoom level
};




// Initialize Windy Map
windyInit(options, (windyAPI) => {
    const { map} = windyAPI;


    // Check if geolocation is supported
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Set map view to user's current location
                
                map.setView([lat, lon], 10);

                // Add a marker for the user's location
                const userMarker = L.marker([lat, lon]).addTo(map)
                .bindPopup("<b class='popup-text'></b>")
                .openPopup();

                // Fetch location details (city, state, country)
                const locationDetails = await getLocationDetails(lat, lon);

                // Display location below marker
                if (locationDetails) {
                    userMarker.bindPopup(`<b class='popup-text'></b><br><span class='location-details'>${locationDetails}</span>`,{ closeButton: false }).openPopup();
                }

                // Fetch and display weather data
                const weatherData = await fetchWeather(lat, lon);
                displayWeather(weatherData);
                document.getElementById("latitude").innerText = lat;
                document.getElementById("longitude").innerText = lon;
            },
            (error) => {
                console.error("Geolocation error:", error);
                map.setView([20.5937, 78.9629], 5);
                document.getElementById('weather-info').innerHTML = "Location access denied. Showing default location.";
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        map.setView([20.5937, 78.9629], 5);
        document.getElementById('weather-info').innerHTML = "Geolocation is not supported by this browser.";
    }
    

    // Handle map click event
    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;

        // Fetch current weather
        const weatherData = await fetchWeather(lat, lng);
        displayWeather(weatherData);

        // Fetch historical weather (last 5 days)
        const historicalData = await fetchHistoricalWeather(lat, lng, getFormattedDate(new Date()));
        displayHistoricalWeather(historicalData);

        // Fetch rain prediction
        const rainData = await fetchRainPrediction(lat, lng);
        displayRainPrediction(rainData);
    });
    document.getElementById('search-button').addEventListener('click', async () => {
        const city = document.getElementById('search-input').value.trim();
        console.log('Searching for city:', city);
        if (city) {
            const weatherData = await fetchWeatherByCity(city);
            if (weatherData) {
                const lat = weatherData.location.lat;
                const lon = weatherData.location.lon;
                map.setView([lat, lon], 10);
                displayWeather(weatherData);
    
                // Fetch historical weather (last 5 days)
                const historicalData = await fetchHistoricalWeather(lat, lon, getFormattedDate(new Date()));
                displayHistoricalWeather(historicalData);
    
                // Fetch rain prediction
                const rainData = await fetchRainPrediction(lat, lon);
                displayRainPrediction(rainData);
            } else {
                alert('City not found. Please enter a valid city name.');
            }
        }
    });
    async function fetchWeatherByCity(city) {
        const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${city}&aqi=yes`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.location) {
                const lat = data.location.lat;
                const lon = data.location.lon;
                window.searchedCityCoords = { lat, lon };
    
                // Update the map view
                map.setView([lat, lon], 7); 
    
                // Remove old marker if exists
                if (window.cityMarker) {
                    map.removeLayer(window.cityMarker);
                }
    
                // Add a new marker for the searched city
                window.cityMarker = L.marker([lat, lon]).addTo(map)
                    .bindPopup(`<b class='popup-text'>${city}</b>`, { closeButton: false })
                    .openPopup();
    
                return data;
            } else {
                console.error('City not found in API response');
                return null;
            }
        } catch (error) {
            console.error('Error fetching weather data by city:', error);
            return null;
        }
    }
    document.getElementById("refreshLocation").addEventListener("click", async function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async function (position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
    
                    // Set Windy map view to the current location
                    map.setView([lat, lon], 10); // Adjust zoom level as needed
    
                    // Change overlay back to "wind"
                    store.set("overlay", "wind");
    
                    // Remove previous user marker if it exists
                    if (window.userMarker) {
                        map.removeLayer(window.userMarker);
                    }
    
                    // Add a new marker for the updated location
                    window.userMarker = L.marker([lat, lon]).addTo(map)
                        .bindPopup(`<b class='popup-text'>Your Location</b>`, { closeButton: false })
                        .openPopup();
    
                    // Fetch location details
                    const locationDetails = await getLocationDetails(lat, lon);
                    if (locationDetails) {
                        window.userMarker.bindPopup(`<b class='popup-text'></b><br><span class='location-details'>${locationDetails}</span>`, { closeButton: false }).openPopup();
                    }
    
                    // Fetch updated weather data
                    const weatherData = await fetchWeather(lat, lon);
                    displayWeather(weatherData);
    
                    // Fetch updated historical weather (last 5 days)
                    const historicalData = await fetchHistoricalWeather(lat, lon, getFormattedDate(new Date()));
                    displayHistoricalWeather(historicalData);
    
                    // Fetch updated rain prediction
                    const rainData = await fetchRainPrediction(lat, lon);
                    displayRainPrediction(rainData);
    
                    // Update coordinates in UI
                    document.getElementById("latitude").innerText = lat;
                    document.getElementById("longitude").innerText = lon;
                },
                function (error) {
                    console.error("Error getting location:", error);
                    alert("Failed to get your location.");
                }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    });
});

// Function to fetch city, state, and country
async function getLocationDetails(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await response.json();

        if (data.address) {
            const { city, town, village, state, country } = data.address;
            return `${city || town || village || "Unknown City"}, ${state || "Unknown State"}, ${country || "Unknown Country"}`;
        } else {
            return "Location details not found";
        }
    } catch (error) {
        console.error("Error fetching location details:", error);
        return "Error fetching location";
    }
}

// WeatherAPI.com API Key
const WEATHERAPI_KEY = 'f284bb220c1140f790e94654252502'; // Replace with your WeatherAPI.com key

// Fetch current weather data
async function fetchWeather(lat, lon) {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${lat},${lon}&days=1&aqi=yes`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}



// Fetch historical weather data


// Display current weather data
function displayWeather(data) {
    if (data) {
        document.getElementById('location').textContent = `${data.location.name}, ${data.location.country}`;
        document.getElementById('datetime').textContent = format12HourClock(data.location.localtime);
        document.getElementById('temp').textContent = `${data.current.temp_c}°C`;
        document.getElementById('weather').textContent = data.current.condition.text;
        document.getElementById('humidity').textContent = `${data.current.humidity}%`;
        document.getElementById('wind-speed').textContent = `${data.current.wind_kph} km/h`;
        document.getElementById('rain').textContent = `${data.current.precip_mm} mm`;
        document.getElementById('pressure').textContent = `${data.current.pressure_mb} mb`;
        document.getElementById('visibility').textContent = `${data.current.vis_km} km`;
        


        if (data.forecast && data.forecast.forecastday && data.forecast.forecastday[0].astro) {
            let sunrise = data.forecast.forecastday[0].astro.sunrise;
            let sunset = data.forecast.forecastday[0].astro.sunset;
            console.log("Full API Response:", data);
        console.log("Forecast Day Data:", data.forecast.forecastday[0]);

            console.log("Sunrise:", sunrise, "Sunset:", sunset); // Check values in console

            document.getElementById('sunrise').textContent = `Sunrise: ${sunrise}`;
            document.getElementById('sunset').textContent = `Sunset: ${sunset}`;
        } else {
            console.warn("Sunrise and Sunset data not available.");
            document.getElementById('sunrise').textContent = "Sunrise: N/A";
            document.getElementById('sunset').textContent = "Sunset: N/A";
        }
        

        // ✅ Display Air Quality
        if (data.current.air_quality) {
            const airQuality = data.current.air_quality;
            const aqiIndex = airQuality["us-epa-index"];
            const aqiLabel = getAQIDescription(aqiIndex);

            // ✅ Separate AQI Number & Description
            document.getElementById('aqi-value').textContent = aqiIndex; 
            document.getElementById('aqi-description').textContent = aqiLabel;

            // ✅ Apply color coding to AQI value
            document.getElementById('aqi-description').style.color = getAQIColor(aqiIndex);

            // ✅ Update other air quality data
            document.getElementById('pm25').textContent = `PM2.5: ${airQuality.pm2_5} µg/m³`;
            document.getElementById('pm10').textContent = `PM10: ${airQuality.pm10} µg/m³`;
            document.getElementById('co').textContent = `CO: ${airQuality.co} µg/m³`;
            document.getElementById('no2').textContent = `NO2: ${airQuality.no2} µg/m³`;
            updateAQI(aqiIndex);
        } else {
            document.getElementById('aqi-value').textContent = "N/A";
            document.getElementById('aqi-description').textContent = "Data not available";
        }

        let weatherCondition = data.current.condition.text.toLowerCase();
        let isNight = data.current.is_day === 0;
        updateWeatherImage(weatherCondition, isNight);
    } else {
        document.getElementById('location').textContent = 'Error fetching weather data';
    }
}


function getAQIDescription(aqi) {
    if (aqi === 1) return "Good";       
    if (aqi === 2) return "Moderate";    
    if (aqi === 3) return "Unhealthy"; 
    if (aqi === 4) return "Unhealthy";   
    if (aqi === 5) return "Very Unhealthy"; 
    if (aqi === 6) return "Hazardous";   
    return "Unknown";
}

function getAQIColor(aqi) {
    if (aqi === 1) return "green";     
    if (aqi === 2) return "yellow";    
    if (aqi === 3) return "orange";    
    if (aqi === 4) return "red";       
    if (aqi === 5) return "purple";    
    if (aqi === 6) return "maroon";    
    return "black";  
}
function updateAQI(aqi) {
    let description = "";
    let imageUrl = "";

    // ✅ Assign AQI category & corresponding image
    if (aqi === 1) {
        description = "Good";
        imageUrl = "images/pleasant.svg";
    } else if (aqi === 2) {
        description = "Moderate";
        imageUrl = "images/moderate.svg";
    } else if (aqi === 3 || aqi === 4) {
        description = "Unhealthy";
        imageUrl = "images/unhealthy.svg";
    } else if (aqi === 5) {
        description = "Poor";
        imageUrl = "images/poor.svg";
    } else if (aqi === 6) {
        description = "Hazardous";
        imageUrl = "images/hazardous.svg";
    } else {
        description = "Unknown";
        imageUrl = "unknown.png";
    }

    // ✅ Update text and image dynamically
    document.getElementById("aqi-description").textContent = description;
    document.getElementById("aqi-image").src = imageUrl;
}





function format12HourClock(dateTime) {
    const [date, time] = dateTime.split(' ');
    let [hours, minutes] = time.split(':');
    let period = 'AM';

    hours = parseInt(hours);
    if (hours >= 12) {
        period = 'PM';
        if (hours > 12) {
            hours -= 12;
        }
    } else if (hours === 0) {
        hours = 12; // Convert 00 to 12 AM
    }

    return `${date} ${hours}:${minutes} ${period}`;
}

// Helper function to format date as YYYY-MM-DD
function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function updateWeatherImage(weatherCondition, isNight) {
    let weatherImage = document.getElementById("weather-icon");  
    let imagePath = "./images/"; // ✅ Define imagePath before using it

    if (isNight) {
        switch (weatherCondition.toLowerCase()) {
            case "clear":
            case "sunny":
                weatherImage.src = imagePath + "clear-night.png";
                break;
            case "rain":
            case "rainy":
            case "drizzle":
                weatherImage.src = imagePath + "rainy-night.png";
                break;
            case "clouds":
            case "cloudy":
            case "partly cloudy":
                weatherImage.src = imagePath + "cloudy-night.png";
                break;
            case "thunderstorm":
                weatherImage.src = imagePath + "thunderstorm-night.png";
                break;
            case "snow":
                weatherImage.src = imagePath + "snow-night.png";
                break;
            case "mist": 
            case "fog":
                weatherImage.src = imagePath + "mist-night.png";
                break;
            default:
                weatherImage.src = imagePath + "default-night.png"; 
        }
    } else {
        switch (weatherCondition.toLowerCase()) {
            case "clear":
            case "sunny":
                weatherImage.src = imagePath + "sunny.png";
                break;
            case "rain":
            case "rainy":
            case "drizzle":
                weatherImage.src = imagePath + "rainy.png";
                break;
            case "clouds":
            case "cloudy":
            case "partly cloudy":
                weatherImage.src = imagePath + "cloudy.png";
                break;
            case "thunderstorm":
                weatherImage.src = imagePath + "thunderstorm.png";
                break;
            case "snow":
                weatherImage.src = imagePath + "snow.png";
                break;
            case "mist":  // ✅ Added mist case
            case "fog":
                weatherImage.src = imagePath + "mist.png";
                break;
            default:
                weatherImage.src = imagePath + "default.png"; 
        }
    }

    // Debugging
    console.log("Weather Condition:", weatherCondition);
    console.log("Is Night:", isNight);
    console.log("Image Source Set:", weatherImage.src);
}

document.addEventListener("DOMContentLoaded", function () {
    const tempBar = document.querySelector(".temp-bar");
    const tempBar2 = document.querySelector(".temp-bar2");

    tempBar.addEventListener("click", function () {
        tempBar.style.display = "none";  // Hide temp-bar
        tempBar2.style.display = "block"; // Show temp-bar2
    });

    tempBar2.addEventListener("click", function () {
        tempBar2.style.display = "none"; // Hide temp-bar2
        tempBar.style.display = "block"; // Show temp-bar
    });
});
document.addEventListener("DOMContentLoaded", function () {
    const buttonwet = document.querySelector(".butonwet");
    const weat = document.querySelector(".Weat");
    const weatcross = document.querySelector(".weatonecross");
    const tempone = document.querySelector(".temp-bar");
    const temptwo = document.querySelector(".temp-bar2");

    const aboutLink = document.querySelector(".home-bar a:nth-child(2)"); // "About" link
    const about = document.querySelector(".about"); // About section
    const aboutCross = document.querySelector(".aboutcross"); // About close button

    const contactLink = document.querySelector(".home-bar a:nth-child(3)"); // "Contact" link
    const contact = document.querySelector(".contact"); // Contact section
    const contactCross = document.querySelector(".contactcross"); // Contact close button

    // Weather Section Toggle
    buttonwet.addEventListener("click", function () {
        weat.style.display = "block";
        tempone.style.right = "42%"; 
        temptwo.style.right = "42%";

        // Adjust Windy API Zoom Button positions
        document.querySelectorAll(".zoom-plus, .zoom-minus").forEach(el => {
            el.style.setProperty("right", "745px", "important");
        });
    });

    weatcross.addEventListener("click", function () {
        weat.style.display = "none";  
        tempone.style.right = "3.4%"; 
        temptwo.style.right = "3.4%";

        // Reset Windy API Zoom Button positions
        document.querySelectorAll(".zoom-plus, .zoom-minus").forEach(el => {
            el.style.setProperty("right", "49px", "important");
        });
    });

    // About Section Toggle
    aboutLink.addEventListener("click", function () {
        about.style.display = "block";
        tempone.style.right = "42%"; 
        temptwo.style.right = "42%";

        // Adjust Windy API Zoom Button positions when About is open
        document.querySelectorAll(".zoom-plus, .zoom-minus").forEach(el => {
            el.style.setProperty("right", "745px", "important");
        });
    });

    aboutCross.addEventListener("click", function () {
        about.style.display = "none";
        tempone.style.right = "3.4%"; 
        temptwo.style.right = "3.4%";

        // Reset Windy API Zoom Button positions when About is closed
        document.querySelectorAll(".zoom-plus, .zoom-minus").forEach(el => {
            el.style.setProperty("right", "49px", "important");
        });
    });

    // Contact Section Toggle
    contactLink.addEventListener("click", function () {
        contact.style.display = "block";
        tempone.style.right = "42%"; 
        temptwo.style.right = "42%";

        // Adjust Windy API Zoom Button positions when Contact is open
        document.querySelectorAll(".zoom-plus, .zoom-minus").forEach(el => {
            el.style.setProperty("right", "745px", "important");
        });
    });

    contactCross.addEventListener("click", function () {
        contact.style.display = "none";
        tempone.style.right = "3.4%"; 
        temptwo.style.right = "3.4%";

        // Reset Windy API Zoom Button positions when Contact is closed
        document.querySelectorAll(".zoom-plus, .zoom-minus").forEach(el => {
            el.style.setProperty("right", "49px", "important");
        });
    });
});




function changeLayer(layerName) {
    if (windyAPI) {
        windyAPI.store.set('overlay', layerName);
    }
}


function copyToClipboard(element) {
    const projectLink = "https://yourprojectlink.com"; // Replace with your actual project link
    const tooltip = element.querySelector(".tooltip"); // Get tooltip inside the clicked .share div

    navigator.clipboard.writeText(projectLink)
    .then(() => {
        tooltip.textContent = "Copied!";
    })
    .catch(err => {
        console.error("Failed to copy: ", err);
        tooltip.textContent = "Failed!";
    });
}

function resetTooltip(element) {
    const tooltip = element.querySelector(".tooltip"); // Get tooltip inside the hovered .share div
    tooltip.textContent = "Click to Copy";
}  
  