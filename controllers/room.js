const RoomService = require('../services/room');

class RoomController {
    static create = async (req, res)=>  {
        const { name, type, max_people_inside } = req.body;

        const room = await RoomService.findRoomByName(name);
        if (room) {
            return res.status(409).json({ message: 'Room name already taken' });
        }

        const response = await RoomService.createRoom({ name, type, max_people_inside });
        return res.status(200).json(response);
    }

    static delete = async (req, res)=>  {
        const { id } = req.body;

        const room = await RoomService.findRoomById(id);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        if (room.user !== req.user.id || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You are not the owner of this room' });
        }

        await room.remove();
        return res.status(200).json({ success: true });
    }

    static edit = async (req, res)=>  {
        const { id, name, type, max_people_inside } = req.body;

        const room = await RoomService.findRoomById(id);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        if (room.user !== req.user.id || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You are not the owner of this room' });
        }

        const response = await RoomService.editRoom(room, { name, type, max_people_inside });
        return res.status(200).json(response);
    }

    static createRoom = () => {

    }
}

module.exports = RoomController;