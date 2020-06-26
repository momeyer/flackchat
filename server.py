import os
import requests
import random
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)


class User():
    def __init__(self, username, color):
        self.username = username
        self.color = color

    def __str__(self):
        return f"User-username: {self.username}\nUser-color: {self.color}"


class ServerData():
    users = {}
    groups = {}
    privates = {}

    @staticmethod
    def add_new_user_if_available(username, color, status, socket_id):
        if username not in ServerData.users.keys():
            ServerData.users[username] = {
                'username': username, 'color': color, 'status': status, 'socket_id': socket_id, 'messages': {}}
            return True
        else:
            return False

    @staticmethod
    def add_group_if_available(group_name_key, group_name, group_color, group_icon):
        if group_name_key not in ServerData.groups.keys():
            ServerData.groups[group_name_key] = {'groupName': group_name,
                                                "groupColor": group_color,
                                                "groupIcon": group_icon,
                                                'messages': []}
            return True
        else:
            return False

    @staticmethod
    def store_message(chat_type, receiver, message):
        if chat_type == 'private':
            if receiver not in ServerData.privates.keys():
                ServerData.privates[receiver] = {'messages': [message]}
            else:
                ServerData.privates[receiver]['messages'].append(message)
                if len(ServerData.privates[receiver]['messages']) >= 101:
                    ServerData.privates[receiver]['messages'].pop(0)
        else:
            ServerData.groups[receiver]['messages'].append(message)
            if len(ServerData.groups[receiver]['messages']) >= 101:
                ServerData.groups[receiver]['messages'].pop(0)


    @staticmethod
    def populateApp():
        colors = ['#a9dc76', '#ffd766', '#78dce8',
                  '#ab9df2', '#ff6087', '#fb9767']
        groupNames = ['GroupExample', 'AnotherGroup', 'CS50',
                      'CS50Projects', 'FlaskGroup', 'Group_1']
        peopleName = ['Maria', 'James', 'Kate', 'John',
                      'Peter', 'Samantha', 'Eduard', 'Cath']
        status = [True, False]

        for name in groupNames:
            icon = random.randint(1, 25)
            color = random.choice(colors)
            ServerData.groups[f'{name}_div'] = {
                'groupName': name, "groupColor": color, 'groupIcon': icon, 'messages': []}

        for name in peopleName:
            userStatus = random.choice(status)
            color = random.choice(colors)
            socket_id = 5454622646844587846998
            ServerData.users[name] = {'username': name, "color": color, 'status': userStatus, 'socket_id' : socket_id}
            socket_id += 15


ServerData.populateApp()


class ChatRoom():
    def __init__(self, group_name, group_color, icon):
        self.group_name = group_name
        self.color = group_color
        self.icon = icon
        self.messages = []


class SocketEvents ():
    Connect = 'connect'
    Message = 'send_message'
    SendUserName = 'send_username'
    GroupMessage = 'group_message'
    PrivateMessage = 'private_message'
    SendGroupName = 'send_group_name'
    RequestUpdates = 'request_updates'
    NewUser = 'new_user'
    ChangeOfStatus = 'change_of_status'
    Disconect = 'disconect'
    JoinRoom = 'join'
    LeaveRoom = 'leave'

@app.route("/")
def index():
    return render_template("index.html")


@socketio.on(SocketEvents.Connect)
def on_connect():
    print("User Connected")


@socketio.on(SocketEvents.ChangeOfStatus)
def status_online(data):
    emit(SocketEvents.ChangeOfStatus, data, broadcast=True)
    if not data['status']:
        emit(SocketEvents.Disconect, data,  broadcast=True)


@socketio.on(SocketEvents.RequestUpdates)
def on_request_updates():
    updates = [ServerData.groups, ServerData.users, ServerData.privates]
    emit(SocketEvents.RequestUpdates, updates)

@socketio.on(SocketEvents.Message)
def on_message(data):
        print(data['message'])
        ServerData.store_message(data['type'], data['name'],  data['message'])
        if data['type'] == 'group':
            emit(SocketEvents.GroupMessage, data, broadcast=True)
        if data['type'] == 'private':
            emit(SocketEvents.PrivateMessage, data, broadcast=True)

@socketio.on(SocketEvents.SendUserName)
def on_new_user(data):
    if ServerData.add_new_user_if_available(data['username'], data['color'], data['status'], data['socket_id']):
        data['available'] = True
        emit(SocketEvents.SendUserName, data)
    else:
        data['available'] = False
        emit(SocketEvents.SendUserName, data)

    emit(SocketEvents.NewUser, data, broadcast=True)


@socketio.on(SocketEvents.SendGroupName)
def create_new_group(data):
    groupName = f"{data['groupName']}_div"

    if ServerData.add_group_if_available(groupName, data['groupName'], data['groupColor'], data['groupIcon']):
        data['available'] = True
        emit(SocketEvents.SendGroupName, data, broadcast=True)
    else:
        data['available'] = False
        emit(SocketEvents.SendGroupName, data, broadcast=True)


if __name__ == "__main__":
    app.run()
