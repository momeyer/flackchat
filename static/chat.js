$(document).ready(initAll);

function initAll() {
  var socket = new SocketConnector();
  socket.io.on(SocketEvents.Connect, () => {
    var user = new User(socket);
    var chat = new Chat(socket, user);

    window.addEventListener("beforeunload", () => {
      socket.io.emit(SocketEvents.ChangeOfStatus, {
        username: user.username,
        color: user.color,
        status: false,
      });
    });
  });
}

class SocketEvents {
  static Connect = "connect";
  static SendUserName = "send_username";
  static SendMessage = "send_message";
  static GroupMessage = "group_message";
  static PrivateMessage = "private_message";
  static SendGroupName = "send_group_name";
  static RequestUpdates = "request_updates";
  static NewUser = "new_user";
  static ChangeOfStatus = "change_of_status";
  static JoinRoom = "join";
  static LeaveRoom = "leave";
}

class SocketConnector {
  constructor() {
    this.io = io.connect(
      location.protocol + "//" + document.domain + ":" + location.port
    );
  }
}

class HTMLUtils {
  static curChatroom = { type: "", name: "" };
  static lastAccessed = "";

  static accessChatroom(clicked_id) {
    HTMLUtils.curChatroom.name = `${clicked_id}_div`;
    HTMLUtils.curChatroom.type = "group";
    HTMLUtils.lastAccessed = clicked_id;
  }

  static accessPrivateChat(clicked_id) {
    HTMLUtils.curChatroom.name = `${clicked_id}`;
    HTMLUtils.curChatroom.type = "private";
    HTMLUtils.lastAccessed = clicked_id.split(`_`)[0];
    console.log(HTMLUtils.lastAccessed)
  }

  static createUserLiElement(username, this_user, color, status) {
    const userLiElement = document.createElement("li");
    if (username !== this_user) {
      if (username < this_user) {
        var div_name = `${username}_${this_user}`;
      } else {
        var div_name = `${this_user}_${username}`;
      }

      userLiElement.innerHTML = `<a class="nav-link" onclick="HTMLUtils.accessPrivateChat('${div_name}')" id="${username}" data-toggle="pill" href="#${div_name}" role="tab" aria-controls="${div_name}" aria-selected="false"><span class='status'><svg  id='${username}_status' class="bi bi-circle-fill online_sign" width="0.5em" height="0.5em" viewBox="0 0 16 16" fill="${status}" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="8"/></svg></span><span style="color:${color};" >${username}</span></a>`;
      return userLiElement;
    }
  }
  static createGroupLiElement(groupName, color, icon) {
    const groupLiElement = document.createElement("li");
    groupLiElement.innerHTML = `<a class="nav-link" onclick="HTMLUtils.accessChatroom('${groupName}')" id="${groupName}" data-toggle="pill" href="#${groupName}_div" role="tab" aria-controls="${groupName}_div" aria-selected="false"><span style="color:${color};" ><img src="../static/project_images/${icon}.png" height="20vh">  ${groupName}</span></a>`;
    return groupLiElement;
  }

  static createTabDiv(name, icon) {
    return `<div class="tab-pane fade" id="${name}_div" role="tabpanel" aria-labelledby="${name}"><h6><img src="../static/project_images/${icon}.png" height="35vh"> - ${name}<h6></div>`;
  }
  static createPrivateTabDiv(name, this_user, color) {
    if (name < this_user) {
      var div_name = `${name}_${this_user}`;
    } else {
      var div_name = `${this_user}_${name}`;
    }
    return `<div class="tab-pane fade" id="${div_name}" role="tabpanel" aria-labelledby="${name}"><h6 style="color:${color};">${name}<h6></div>`;
  }

  static createAlert(type, message1, message2, color) {
    const alert = `<div class="alert alert-${type} alert-dismissible fade show" role="alert"><strong style="color: ${color};" >   ${message1} </strong>${message2}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
    $("#chatroom_div").append(alert);
  }

  static updateStatus(status) {
    if (status) {
      return "#a9dc76";
    } else {
      return "#222222";
    }
  }
}

class User {
  constructor(socket) {
    this.socket = socket;

    this.createNewGroupButton = $("#new_group_button");
    this.sendUsernameButton = $("#save_username_button");
    this.usernameInputField = $("#username_input_field");
    this.registrationModal = $("#registration_modal");
    this.username = "";
    this.color = "";
    this.status = "";

    this.checkAndRegister();
  }

  requestExistentGroups() {
    this.socket.io.emit(SocketEvents.RequestUpdates);
  }

  registerUser() {
    this.username = this.usernameInputField.val();
    this.status = true;

    if (this.username.trim() !== "" && this.username.length > 0) {
      this.socket.io.emit(SocketEvents.SendUserName, {
        username: this.username,
        color: this.color,
        status: this.status,
        socket_id: this.socket.io.id,
      });
    } else {
      HTMLUtils.createAlert(
        "warning",
        "Oooops",
        "you need a username :)",
        "orange"
      );
    }

    this.socket.io.on(SocketEvents.SendUserName, (data) => {
      if (data.available) {
        localStorage.setItem("username", this.username);
        localStorage.setItem("color", this.color);
        this.status = data.status;
        this.requestExistentGroups();
        this.socket.io.emit(SocketEvents.ChangeOfStatus, {
          username: this.username,
          color: this.color,
          status: this.status,
        });
      } else {
        HTMLUtils.createAlert(
          "warning",
          "Holy guacamole!",
          "username is not avalible, please try again :)",
          data.color
        );
      }
    });
  }

  checkAndRegister() {
    if (!localStorage.getItem("username")) {
      this.registrationModal.modal("show");
      this.handleColorRadioButtons();
      this.sendUsernameButton.click(() => {
        this.registerUser();
      });
    } else {
      this.username = localStorage.getItem("username");
      this.color = localStorage.getItem("color");
      this.status = true;
      this.requestExistentGroups();
      HTMLUtils.createAlert(
        "success",
        "Welcome back",
        `${this.username}!`,
        this.color
      );
      this.socket.io.emit(SocketEvents.ChangeOfStatus, {
        username: this.username,
        color: this.color,
        status: this.status,
      });
    }
  }

  handleColorRadioButtons() {
    $("input[type='radio']").click(() => {
      var color = $("input[name='color']:checked").val();
      if (color) {
        this.color = color;
      }
    });
  }
}

class Chat {
  constructor(socket, user) {
    this.socket = socket;
    this.user = user;

    this.sendMessageButton = $("#send_message_button");
    this.saveGroupNameButton = $("#save_group_name_button");
    this.groupNameInput = $("#group_name_input");
    this.messageTextArea = $("#message_textarea");
    this.groupChatList = $("#group_chats_list");
    this.navTabsDiv = $("#nav-tab");
    this.chatroomDiv = $("#chatroom_div");
    this.privateChatsList = $("#private_chats_list");

    this.timeZone = "UTC";
    this.icon = "";

    this.createMessageHandler();
    this.createNewGroupChatHandler();
    this.createReceiveNewGroupHandler();
    this.createReceiveExistenteGroupsHandler();
    this.createReceiveNewUserHandler();
    this.createUserStatusHandler();
  }

  createReceiveExistenteGroupsHandler() {
    this.socket.io.on(SocketEvents.RequestUpdates, (updates) => {
      var groups = updates[0];
      var users = updates[1];
      var privates = updates[2];

      for (var group in groups) {
        var groupLiElement = HTMLUtils.createGroupLiElement(
          groups[group].groupName,
          groups[group].groupColor,
          groups[group].groupIcon
        );
        this.groupChatList.append(groupLiElement);
        var groupTabDiv = HTMLUtils.createTabDiv(
          groups[group].groupName,
          groups[group].groupIcon
        );
        this.chatroomDiv.append(groupTabDiv);
        $(`#${groups[group].groupName}_div`).append(groups[group].messages);
      }

      for (var user in users) {
        var status = HTMLUtils.updateStatus(users[user].status);

        const userLiElement = HTMLUtils.createUserLiElement(
          users[user].username,
          this.user.username,
          users[user].color,
          status
        );
        this.privateChatsList.append(userLiElement);

        const userDiv = HTMLUtils.createPrivateTabDiv(
          users[user].username,
          this.user.username,
          users[user].color
        );
        this.chatroomDiv.append(userDiv);
      }

      for (var chat in privates) {
        $(`#${chat}`).append(privates[chat]["messages"]);
      }

      if (localStorage.getItem("lastAccessed")) {
        document.getElementById(localStorage.getItem("lastAccessed")).click();
      }
    });
  }

  createUserStatusHandler() {
    this.socket.io.on("disconect", (data) => {
      document
        .getElementById(`${data.username}_status`)
        .setAttribute("fill", "#222222");
    });
  }

  createReceiveNewUserHandler() {
    this.socket.io.on(SocketEvents.NewUser, (data) => {
      const userLiElement = HTMLUtils.createUserLiElement(
        data.username,
        this.user.username,
        data.color,
        "#a9dc76"
      );
      this.privateChatsList.append(userLiElement);
      var userTabDiv = HTMLUtils.createPrivateTabDiv(
        data.username,
        this.user.username,
        data.color
      );
      this.chatroomDiv.append(userTabDiv);
    });
  }

  createMessageHandler() {
    this.sendMessageButton.click(() => {
      var message = this.messageTextArea.val();
      const curTime = new Date().toLocaleTimeString("en-GB", {
        timeZone: this.timeZone,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
      var str_msg = `<p class='message'><span style='color: rgb(68, 67, 67)';>${curTime}  </span><span style='color:${this.user.color};'>${this.user.username}<span style='color: white';> $ </span> ${message}</span></p>`;
      this.socket.io.emit(SocketEvents.SendMessage, {
        message: str_msg,
        name: HTMLUtils.curChatroom.name,
        type: HTMLUtils.curChatroom.type,
      });

      localStorage.setItem("lastAccessed", HTMLUtils.lastAccessed);
      this.messageTextArea.val("");
    });

    this.socket.io.on(SocketEvents.GroupMessage, (data) => {
      $(`#${data.name}`).append(data.message);
    });

    this.socket.io.on(SocketEvents.PrivateMessage, (data) => {
      $(`#${data.name}`).append(data.message);
    });
  }

  createReceiveNewGroupHandler() {
    this.socket.io.on(SocketEvents.SendGroupName, (data) => {
      if (data.available) {
        var groupLiElement = HTMLUtils.createGroupLiElement(
          data.groupName,
          data.groupColor,
          data.groupIcon
        );
        this.groupChatList.append(groupLiElement);
        var groupTabDiv = HTMLUtils.createTabDiv(
          data.groupName,
          data.groupIcon
        );
        this.chatroomDiv.append(groupTabDiv);
      } else {
        HTMLUtils.createAlert(
          "success",
          "Ooops",
          "sorry, name is not available, try again",
          data.groupColor
        );
      }
    });
  }

  createNewGroupChatHandler() {
    this.handleIconRadioButtons();
    this.saveGroupNameButton.click(() => {
      let newGroupName = this.groupNameInput.val();

      if (newGroupName.trim() !== "") {
        this.socket.io.emit(SocketEvents.SendGroupName, {
          groupName: newGroupName,
          groupColor: this.user.color,
          groupIcon: this.icon,
        });
        this.groupNameInput.val("");
      } else {
        HTMLUtils.createAlert(
          "warning",
          "Holy guacamole!",
          "Ooops, please enter group name ",
          "orange"
        );
      }
    });
  }

  handleIconRadioButtons() {
    $("input[type='radio']").click(() => {
      var icon = $("input[name='icon']:checked").val();
      if (icon) {
        this.icon = icon;
      }
    });
  }
}
