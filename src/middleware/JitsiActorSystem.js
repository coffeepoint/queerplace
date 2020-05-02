import JitsiMeetJS from '../jitsi-meet-js';

export class JitsiActorSystem {

    room = null;
    connection = null;
    userMap = new Map();
    meetingUpdateActor = undefined;
    actorMap = new Map();
    passwordTried = false;


    constructor(meetingUpdateActor, roomName, password, displayName, systemUp, systemFailed) {

        this.meetingUpdateActor = meetingUpdateActor;
        this.meetingUpdateActor.actorSystem = this;
        this.roomName = roomName;
        this.password = password;
        this.displayName = displayName;
        // initiate Jitsi
        const lowLevelOptions = {
            hosts: {
                domain: 'meet.jit.si',
                muc: 'conference.meet.jit.si',
            },
            bosh: 'wss://meet.jit.si/xmpp-websocket?room=' + roomName,
            serviceUrl: 'wss://meet.jit.si/xmpp-websocket?room=' + roomName,
            clientNode: 'http://jitsi.org/jitsimeet',
            websocket: 'wss://meet.jit.si/xmpp-websocket' // FIXME: use xep-0156 for that
        };
        const initOptions = {
            disableAudioLevels: true
        };
        JitsiMeetJS.init(initOptions);
        const that = this;
        const connection = new JitsiMeetJS.JitsiConnection(null, null, lowLevelOptions);
        function onConnectionSuccess() {
            console.log('Connection Success');
            that.room = connection.initJitsiConference(roomName, {
                'startSilent': true,
                openBridgeChannel: true
            });
            that.room.on(JitsiMeetJS.events.conference.USER_JOINED, (id, participant) => {
                console.log('user joined ' + id + ' ' + participant.getDisplayName());
                if (participant.getDisplayName()) {
                    that.userMap.set(id, participant.getDisplayName());
                    that.updateState();
                }
                // resend my room location for the new joiner as jitsi chat history is limited
                if (id!==that.room.myUserId()) {
                    that.send('room', that.meetingUpdateActor.rooms.currentRoomId);
                }
            });
            that.room.on(JitsiMeetJS.events.conference.TRACK_ADDED, track => { });
            that.room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, track => {
                console.log(`track removed!!!${track}`);
            });
            that.room.on(JitsiMeetJS.events.conference.USER_LEFT, id => {
                console.log('user left ' + id);
                that.actorMap.forEach((actor, key) => {
                    actor.userLeft(id);
                });
                that.userMap.delete(id);
                that.updateState();
            });
            that.room.on(JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, (id, displayName) => {
                console.log('user ' + id + ' changed name to ' + displayName);
                that.userMap.set(id, displayName);
            });
            that.room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
                console.log('Conference Joined');
                if (!that.passwordTried) {
                    // seems to a slight delay until moderator status kicks in.
                    setTimeout(()=>that.room.lock(that.password),500);
                }
                that.userMap.set(that.room.myUserId(), that.displayName);
                that.room.setDisplayName(that.displayName);
                that.updateState();
                systemUp();
            });
            that.room.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, (errorCode) => {
                if (errorCode === JitsiMeetJS.errors.conference.PASSWORD_REQUIRED) {
                    if (that.passwordTried) {
                        systemFailed();
                    }
                    else {
                        that.passwordTried = true;
                        that.room.join(that.password);
                    }
                }
            });
            that.room.on(JitsiMeetJS.events.conference.MESSAGE_RECEIVED, (id, message, ts) => {
                console.log('JitsiActorSystem message received '+id+' '+message);
                if (that.userMap.has(id)) {

                    const data = message.split('|');
                    console.log('JitsiActorSystem known '+id+' '+data[0]+' '+data[1]);
                    if (that.actorMap.has(data[0])) {
                        that.actorMap.get(data[0]).onMessage({userId: id, data: data[1]});
                    }

                }

            });
            that.room.join();
        }
        connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
        connection.connect();

    }

    registerActor(actor) {
        this.actorMap.set(actor.key, actor);
        actor.actorSystem = this;
    }

    updateState() {
        if (this.meetingUpdateActor) {
            this.meetingUpdateActor.onMessage(this.userMap);
        }
    }

    send(key, data) {
        this.room.sendTextMessage(key+'|'+data);
    }

    shutdown() {
        if (this.room) {
            this.room.leave();
        }
        if (this.connection) {
            this.connection.disconnect();
        }
    }

}

export default JitsiActorSystem;