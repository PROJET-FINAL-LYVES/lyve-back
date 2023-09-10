function loadClientAndExecute(videoId) {
    const apiKey = "AIzaSyDHgb6qUJo_Liox5P9qWXqXwKTrC9zdTFg"; // Replace with your actual API key
    const discoveryUrl = "https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest";

    fetch(discoveryUrl)
        .then(response => response.json())
        .then(data => {
            console.log("GAPI client loaded for API", data);
            execute(apiKey, videoId);
        })
        .catch(err => {
            console.error("Error loading GAPI client for API", err);
        });
}

function execute(apiKey, videoId) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&part=snippet&id=${videoId}&key=${apiKey}`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            data.items.forEach(item => {
                const videoData = {
                    title: item.snippet.title,
                    description: item.snippet.description,
                    duration: transformDuration(item.contentDetails.duration)
                };
                console.log("Video Details fetched ", video_title);
                return videoData;
            });
            console.log("Response", data);
        })
        .catch(err => {
            console.error("Execute error", err);
        });
}

function transformDuration(duration) {
    const reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
    let hours = 0, minutes = 0, seconds = 0, totalseconds;

    if (reptms.test(duration)) {
        var matches = reptms.exec(duration);
        if (matches[1]) hours = Number(matches[1]);
        if (matches[2]) minutes = Number(matches[2]);
        if (matches[3]) seconds = Number(matches[3]);
        return {
            hours: hours,
            minutes: minutes,
            seconds: seconds
        }
    }
}