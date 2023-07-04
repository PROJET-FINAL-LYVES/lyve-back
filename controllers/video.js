const VideoService = require('../services/video');

class VideoController {
    // TODO: fetch userid from jwt auth token
    static addVideoToPlaylist = async (data) => {
        if (!data.url) return { success: false, message: 'Invalid URL' };

        await VideoService.addVideoToPlaylist(data);

        return { success: true };
    }
}

module.exports = VideoController;