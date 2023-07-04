const Video = require('../schemas/video');

class VideoService {
    static addVideoToPlaylist = async (video) => {
        try {
            await new Video(video).save();
            return true;
        } catch (err) {
            return false;
        }
    }
}

module.exports = VideoService;