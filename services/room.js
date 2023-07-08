const Room = require('../schemas/room');
const { handleErrorMessages } = require('../helpers')
const {ROOM_LIMIT} = require("../constants/app");

class RoomService {
    static async createRoom(roomInfo) {
        try {
            const room = new Room(roomInfo);
            await room.save();
            return { success: true, room: room };
        } catch (err) {
            const errorFields = ['name', 'type', 'max_people_inside'];
            return { success: false, message: handleErrorMessages(err.errors, errorFields) };
        }
    }

    static async deleteRoom(id) {
        try {
            await Room.deleteOne({ id });
            return { success: true };

        }catch (err) {
            const errorFields = ['id'];
            return { success: false, message: handleErrorMessages(err.errors, errorFields) };
        }
    }

    static async editRoom(room, roomInfo) {
        try {
            room.name = roomInfo.name;
            room.type = roomInfo.type;
            room.max_people_inside = roomInfo.max_people_inside;
            await room.save();

            return { success: true, room: room };
        } catch (err) {
            const errorFields = ['name', 'type', 'max_people_inside'];
            return { success: false, message: handleErrorMessages(err.errors, errorFields) };
        }
    }
    static async findRoomByName(name) {
        return await Room.findOne({ name }).exec();
    }
    static async findRoomById(id) {
        return await Room.findById(id).exec();
    }

    static async findRooms(page){
        return await Room.find({}).skip((page - 1) * ROOM_LIMIT).limit(ROOM_LIMIT).exec();
        // TODO Order by : )
    }
}

module.exports = RoomService;