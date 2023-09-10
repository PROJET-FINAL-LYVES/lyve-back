const { YOUTUBE_API_VIDEO_DETAILS_URL } = require('../constants/app');

const getVideoData = async videoId => {
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const url = `${YOUTUBE_API_VIDEO_DETAILS_URL}&id=${videoId}&key=${googleApiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    // video not found
    if (data.items.length === 0) {
        return { error: true, message: 'Video not found.' };
    }

    const video = data.items[0];
    return {
        duration: formatVideoDuration(video.contentDetails.duration),
        name: video.snippet.title
    };
};

const formatVideoDuration = duration => {
    const reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
    let hours = 0, minutes = 0, seconds = 0;

    if (reptms.test(duration)) {
        const matches = reptms.exec(duration);

        if (matches[1]) hours = Number(matches[1]);
        if (matches[2]) minutes = Number(matches[2]);
        if (matches[3]) seconds = Number(matches[3]);
    }

    return { hours, minutes, seconds };
};

module.exports = {
    getVideoData,
};