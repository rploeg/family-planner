
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
      "swaggerDoc": {
          "openapi": "3.0.3",
          "info": {
              "title": "PMS & Access API",
              "description": "The PMS & Access API is a robust solution designed to streamline many tasks within a hospitality management system.\n<br> More details can be found in the User Configuration, Door Opening, Room Moods and Room Status sections below.\n\nSome useful links:\n- [User Management Documentation](https://www.loxone.com/wp-content/uploads/datasheets/UserManagement.pdf)\n- [Structure File](https://www.loxone.com/wp-content/uploads/datasheets/StructureFile.pdf)\n- [Communicating with the Loxone Miniserver](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf)\n- [Loxone Home Page](https://www.loxone.com/)\n",
              "version": "1.0.1"
          },
          "servers": [
              {
                  "url": "https://miniserver-ip/jdev/sps"
              }
          ],
          "tags": [
              {
                  "name": "User Configuration",
                  "description": "User Configuration simplifies user creation and NFC tag assignment. These requests allow you to create a user, set the NFC code touch to learning mode, and assign the learned NFC tag to the user in a single command or just set the NFC code touch to learning mode and receive the NFC tag id.  <br><br> An example use case would be the process of creating guest profiles and assigning learned NFC tags for room access in one seamless operation.\n\nEach command uses the NFC code touch `{uuid}`. This can be found in the **LOXAPP** (StructureFile) which you can access ex.:<br> *http://addressOfYourMiniserver/data/LoxApp3.json* <br>\n\nBy searching in *\"controls\"* for the name of your NFC code touch device you will find the *uuid* of that device. Example *uuid: 1e052949-03a5-4ef2-ffffbb105e80296f*<br> An example of how the NFC Code Touch structure looks like in the Structure File can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=96).\n\n**Note:** A system may have multiple NFC Code Touch devices. It is important that the user configures which NFC Code Touch device will be used for learning.  \n  \n\n**Important:** Assigning the user to a group is a crucial step. To do this, include the `{uuid}` of the desired groups in the *\"usergroups\"* field. For a list of available user groups and their corresponding `{uuid}`, refer to the GET */getgrouplist* section below.\n\nA detailed description to the structures and their fields can be found at the bottom of the page under *Schemas*\n\nMore information on User Management functions and fields can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/UserManagement.pdf)\n"
              },
              {
                  "name": "Door Opening",
                  "description": "Door opening commands allow you to send a pulse to the outputs in the NFC code touch function block. <br><br> A typical usecase would be to open a door. <br><br>\nTo determine which *outputNr* should be triggered, you will need to find your NFC Code Touch in the **LOXAPP**(Structure File), for ex. using the name of the NFC code touch, and the *outputNr* can be found under \"details\"->\"accessOutputs\"->\"q1\",\"q2\",...,\"q6\", where 1,2,..,6 are the available outputs. An example of how the NFC Code Touch structure looks like in the Structure File can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/StructureFile.pdf#page=97).<br><br>\n**Important note:** There are two get commands depending on the *User Interface* settings of your NFC code touch. <br>To understand which of the two commands below to use, you will need to retrieve the *IsSecured* field from the NFC Code Touch you want to use from the **LOXAPP**(Structure File) which you can access ex.:<br> *http://addressOfYourMiniserver/data/LoxApp3.json*\n- If *IsSecured* is **false**, then the `/io/` get command is to be used\n- If *IsSecured* is **true**, then the `/ios/` command is to be used. It is a secure command and requires an additional `{hash}` parameter. This is the hash value of the visualization password. How to properly create the hash can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14) under *General Info -> Secured Commands*\n\nEach command uses the NFC code touch `{uuid}`. This can be found in the **LOXAPP** (StructureFile) which you can access ex.:<br> *http://addressOfYourMiniserver/data/LoxApp3.json* <br><br>\n More info can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/StructureFile.pdf#page=98)\n \n"
              },
              {
                  "name": "Room Moods",
                  "description": "Room Moods commands allow you to set a temperature in a room and which music to be played. This is done through the Intelligent Room Controller and Audio Player.<br><br> **Setting Room Temperature:**<br> Preferred room temperatures are preconfigured for each room, based on common comfort levels. The guest can choose their preferred room temperature to adjust the room to their liking. <br><br> For the commands you will need the `{ircUuid}` (Intelligent Room Controller UUID), this can be found in the **LOXAPP** (Structure File) which you can access ex.:*http://addressOfYourMiniserver/data/LoxApp3.json*. <br>By searching in *\"controls\"* for the name of your Intelligent Room Controller you will find the *uuid* of that device. Example *uuid: 1e052949-03a5-4ef2-ffffbb105e80296f*<br>  An example of how the Intelligent Room Controller structure looks like in the Structure File can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=77). <br><br>  It is **important** to know whether the Intelligent Room Controller is set to use a single temperature. This can be found in the **LOXAPP** (Structure File), for ex. using the name of the Intelligent Room Controller, and if it is using single temperature will be under \"details\"->\"singleComfortTemperature\".  \n  - If this is set to `true`, then you should set only the comfort temperature `setComfortTemperature`.\n  - If this is set to `false`, then `setComfortTemperature` sets the comfort temperature for heating and `setComfortTemperatureCool` sets the comfort temperature for cooling.\n  \n   An example of how the Intelligent Room Controller structure looks like in the Structure File can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=77).<br>\n\n**Setting Music Favorite:**<br> Favorites are preconfigured in rooms, for example, using different music genres. Each favorite is assigned a numerical ID, and ideally, the same ID is used for each favorite across all rooms (e.g., through the function blocks template configurations). Using a specific command, a preferred genre or favorite can be preselected for a guest, which will then start playing first. The guest can still manually switch between the other available favorites afterward. <br><br> For the commands you will need the `{audioPlayerUuid}`, this can be found in the **LOXAPP** (Structure File) which you can access ex.:*http://addressOfYourMiniserver/data/LoxApp3.json*. <br>By searching in *\"controls\"* for the name of your Audio Player you will find the *uuid* of that device. Example *uuid: 1e052949-03a5-4ef2-ffffbb105e80296f*<br> An example of how the Audio Player structure looks like in the Structure File can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14). <br><br> Another parameter which you will need is the music *favorite ID*. The available music favorites: their priority in the list, numerical ID and name can be retrieved with the *GET /getmusicfavorites* commands below.\n\n**Important note:** There are different get commands depending on the *User Interface* settings of your Intelligent Room Controller and Audio Player. <br>To understand which of the commands below to use, you will need to retrieve the *IsSecured* field from the Intelligent Room Controller or Audio Player you want to use from the **LOXAPP**(Structure File) which you can access ex.:<br> *http://addressOfYourMiniserver/data/LoxApp3.json*\n- If *IsSecured* is **false**, then the `/io/` get command is to be used\n- If *IsSecured* is **true**, then the `/ios/` command is to be used. It is a secure command and requires an additional `{hash}` parameter. This is the hash value of the visualization password. How to properly create the hash can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14) under *General Info -> Secured Commands* <br>\n\nMore info can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/StructureFile.pdf#page=82)\n"
              },
              {
                  "name": "Room Status",
                  "description": "Room Status commands allow you to retrieve the current room status or activate an existing status. <br><br> An example use case would be checking the status of a room. For instance, if the room status is unclean, then a worker can be sent to clean it and then you can update the status to clean. Similarly, you could check if the room is currently occupied or has a \"do not disturb\" status set by the guest. <br><br> For the commands you will need the `{roomstatusUuid}` (Room Status Function Block UUID), this can be found in the **LOXAPP** (Structure File) which you can access ex.:*http://addressOfYourMiniserver/data/LoxApp3.json*. <br>By searching in *\"controls\"* for the name of your Room Status function block you will find the *uuid* of that device. Example *uuid: 1e052949-03a5-4ef2-ffffbb105e80296f*<br> Here you can also find the mappings of the ids to the status outputs in the field *details->outputs*.<br>  An example of how the Room Status block structure looks like in the Structure File can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=120) (Section Radio).\n\n**Important note:** There are different get commands depending on the *User Interface* settings of your Room Status block. <br>To understand which of the commands below to use, you will need to retrieve the *IsSecured* field from the Room Status block you want to use from the **LOXAPP**(Structure File) which you can access ex.:<br> *http://addressOfYourMiniserver/data/LoxApp3.json*\n- If *IsSecured* is **false**, then the `/io/` get command is to be used\n- If *IsSecured* is **true**, then the `/ios/` command is to be used. It is a secure command and requires an additional `{hash}` parameter. This is the hash value of the visualization password. How to properly create the hash can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14) under *General Info -> Secured Commands* <br>\n"
              }
          ],
          "paths": {
              "/getgrouplist": {
                  "get": {
                      "tags": [
                          "User Configuration"
                      ],
                      "summary": "Lists all available user-groups and additional information",
                      "description": "Lists all available user-groups and additional information.<br><br> **NOTE**: When configuring a new user, it is essential to assign a valid user group identified by `{uuid}` to the user being created.<br> More information on User Management functions and fields can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/UserManagement.pdf)\n",
                      "operationId": "getusergroups",
                      "responses": {
                          "200": {
                              "description": "Successfully retrieved available user groups",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/getgrouplist"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "A serialized JSON string containing user details.",
                                                          "example": "[{\"name\":\"User\",\"description\":\"User\",\"uuid\":\"1e05269f-015d-3de4-ffffbb105e80296f\",\"type\":0,\"userRights\":129},{\"name\":\"Full access\",\"description\":\"Full access\",\"uuid\":\"1e05269f-015d-3de8-ffffbb105e80296f\",\"type\":4,\"userRights\":4294967295}]\n"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The response code.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/getgrouplist"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/configureuser": {
                  "post": {
                      "tags": [
                          "User Configuration"
                      ],
                      "summary": "Create user and teach in NFC tag",
                      "description": "This operation creates or updates a user. \n* If `nfcUuid` is provided, the NFC Code Touch will be set to learning mode and waits the specified timeout until a tag is held to the NFC Code Touch and it has been successfully learnt. \n* If no `nfcUuid` is provided, only the user is created or updated without NFC assignment.\n* User details must be passed as a JSON object in the request body. The JSON structure can be found under *Schemas->UserConfiguration* below or in the [documentation](https://www.loxone.com/wp-content/uploads/datasheets/UserManagement.pdf#page=15).\n* **Important:** Assigning the user to a group is a crucial step. To do this, include the `{uuid}` of the desired groups in the *\"usergroups\"* field. For a list of available user groups and their corresponding `{uuid}`, refer to the GET */getgrouplist* section above.\n\nThe **password** as well as the **visualization password** for the user must be passed on as a **hash** in the JSON, below is how you can create a user password hash:<br>\n  - Use `jdev/sys/getkey2/{username}` to retrieve the `{salt}` and `{hashAlg}`.\n    - salt is user-specific and long-lived.\n    - **hashAlg** specifies which hashing algorithm to use (recent versions use **SHA256**).\n    - A *\"key\"* property is also provided but is not used here; it is a temporarily valid key to be used for hashing when authenticating.\n  - Use the `{hashAlg}` provided and the long-lived `{salt}` to create an uppercase `{passHash}` for the new `{password}`.\n    - Example: `SHA256({password} + \":\" + {salt}).toUpperCase() → {passHash}`\n",
                      "operationId": "postconfigureuser",
                      "parameters": [
                          {
                              "name": "nfcUuid",
                              "in": "query",
                              "description": "The uuid of the NFC code touch which will be set to learning mode.",
                              "required": false,
                              "schema": {
                                  "type": "string",
                                  "example": "nfcUuid"
                              }
                          },
                          {
                              "name": "timeout",
                              "in": "query",
                              "description": "Value in milliseconds for how long the NFC code touch should stay in learning mode. If not passed on, default value is used. Default = 7000.",
                              "required": false,
                              "schema": {
                                  "type": "integer",
                                  "example": 7000
                              }
                          }
                      ],
                      "requestBody": {
                          "description": "Settings of user to create",
                          "content": {
                              "application/json": {
                                  "schema": {
                                      "$ref": "#/components/schemas/UserConfiguration"
                                  }
                              }
                          },
                          "required": true
                      },
                      "responses": {
                          "200": {
                              "description": "Successfully created user and assigned learned NFC tag",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the user configuration."
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "A serialized JSON string containing user details.",
                                                          "example": "{\"name\":\"Name\",\"desc\":\"\",\"uuid\":\"1e213699-03aa-168f-ffff504f94a1173b\",\"userid\":\"1236\",\"ocppid\":\"\",\"firstName\":\"\",\"lastName\":\"\",\"email\":\"\",\"phone\":\"\",\"uniqueUserId\":\"\",\"company\":\"\",\"department\":\"\",\"personalno\":\"\",\"title\":\"\",\"debitor\":\"\",\"customField1\":\"\",\"customField2\":\"\",\"customField3\":\"\",\"customField4\":\"\",\"customField5\":\"\",\"lastEdit\":505574388,\"userState\":0,\"isAdmin\":false,\"changePassword\":true,\"masterAdmin\":false,\"userRights\":16416,\"scorePWD\":0,\"scoreVisuPWD\":-1,\"trustMember\":\"\",\"usergroups\":[],\"nfcTags\":[{\"name\":\"Tester-1-editedNFC\",\"id\":\"7E D9 EA EC FE 2A 9F CB EC\"},{\"name\":\"NameNFC\",\"id\":\"2B 8F A3 AC 1A 6F E8 8A EC\"}],\"keycodes\":[{\"code\":\"A73289F7CAE7B78F9341026A482E578CD27D924F\"}],\"customFields\":[\"Custom Field 1\",\"Custom Field 2\",\"Custom Field 3\",\"Custom Field 4\",\"Custom Field 5\"]}\n"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The response code.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/configureuser/1e052949-03a5-4ef2-ffffbb105e80296f"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "A message describing the error.",
                                                          "example": "NFC learn failure"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "400"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  },
                  "get": {
                      "tags": [
                          "User Configuration"
                      ],
                      "summary": "Create user and teach in NFC tag",
                      "description": "This operation creates or updates a user. \n* If `nfcUuid` is provided, the NFC Code Touch will be set to learning mode and waits the specified timeout until a tag is held to the NFC Code Touch and it has been successfully learnt.\n* If no `nfcUuid` is provided, only the user is created or updated without NFC assignment. \n* User details must be passed as a **Base64** encoding of the JSON string in the userjson query parameter. The JSON structure can be found under *Schemas->UserConfiguration* below or in the [documentation](https://www.loxone.com/wp-content/uploads/datasheets/UserManagement.pdf#page=15).\n* It is **important** to assign the user to a group. You can do this by adding the `{uuid}` of the groups you want the user to be assigned to. To retrieve the available user groups and their `{uuid}` check out the GET */getgrouplist* section above.\n\nThe **password** as well as the **visualization password** for the user must be passed on as a **hash** in the JSON, below is how you can create a user password hash:<br>\n  - Use `jdev/sys/getkey2/{username}` to retrieve the `{salt}` and `{hashAlg}`.\n    - salt is user-specific and long-lived.\n    - **hashAlg** specifies which hashing algorithm to use (recent versions use **SHA256**).\n    - A *\"key\"* property is also provided but is not used here; it is a temporarily valid key to be used for hashing when authenticating.\n  - Use the `{hashAlg}` provided and the long-lived `{salt}` to create an uppercase `{passHash}` for the new `{password}`.\n    - Example: `SHA256({password} + \":\" + {salt}).toUpperCase() → {passHash}`\n\n<br>**NOTE:** We recommend you to use the **POST** */configureuser*\n  method.\n",
                      "operationId": "getconfigureuser",
                      "parameters": [
                          {
                              "name": "nfcUuid",
                              "in": "query",
                              "description": "The uuid of the NFC code touch which will be set to learning mode.",
                              "required": false,
                              "schema": {
                                  "type": "string",
                                  "example": "nfcUuid"
                              }
                          },
                          {
                              "name": "timeout",
                              "in": "query",
                              "description": "Value in milliseconds for how long the NFC code touch should stay in learning mode. If not passed on, default value is used. Default = 7000.",
                              "required": false,
                              "schema": {
                                  "type": "integer",
                                  "example": 7000
                              }
                          },
                          {
                              "name": "userjson",
                              "in": "query",
                              "description": "The json with user parameters to create or edit. See UserConfiguration schema for structure.\n\n**NOTE**: Use a **Base64** encoding for the user json. The user json example can be found under *Schemas->UserConfiguration* at the bottom of the page.\n",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "base64encodedjson"
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully created user and assigned learned NFC tag",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the user configuration."
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "A serialized JSON string containing user details.",
                                                          "example": "{\"name\":\"Name\",\"desc\":\"\",\"uuid\":\"1e213699-03aa-168f-ffff504f94a1173b\",\"userid\":\"1236\",\"ocppid\":\"\",\"firstName\":\"\",\"lastName\":\"\",\"email\":\"\",\"phone\":\"\",\"uniqueUserId\":\"\",\"company\":\"\",\"department\":\"\",\"personalno\":\"\",\"title\":\"\",\"debitor\":\"\",\"customField1\":\"\",\"customField2\":\"\",\"customField3\":\"\",\"customField4\":\"\",\"customField5\":\"\",\"lastEdit\":505574388,\"userState\":0,\"isAdmin\":false,\"changePassword\":true,\"masterAdmin\":false,\"userRights\":16416,\"scorePWD\":0,\"scoreVisuPWD\":-1,\"trustMember\":\"\",\"usergroups\":[],\"nfcTags\":[{\"name\":\"Tester-1-editedNFC\",\"id\":\"7E D9 EA EC FE 2A 9F CB EC\"},{\"name\":\"NameNFC\",\"id\":\"2B 8F A3 AC 1A 6F E8 8A EC\"}],\"keycodes\":[{\"code\":\"A73289F7CAE7B78F9341026A482E578CD27D924F\"}],\"customFields\":[\"Custom Field 1\",\"Custom Field 2\",\"Custom Field 3\",\"Custom Field 4\",\"Custom Field 5\"]}\n"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The response code.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/configureuser/1e052949-03a5-4ef2-ffffbb105e80296f"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "A message describing the error.",
                                                          "example": "NFC learn failure"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "400"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/discovernfc/{nfcUuid}": {
                  "get": {
                      "tags": [
                          "User Configuration"
                      ],
                      "summary": "Set NFC code touch to learning mode",
                      "description": "Sets the NFC code touch to learning mode. This mode is used to then *assign* an NFC tag to a *user*. Assigning the tag to a user is required to grant permissions to the tag, ensuring it can be used within the system.\n* Results display NFC tag info. \n* You can specify the value in milliseconds for how long the NFC code touch should stay in learning mode. \n* If no timeout is provided, the default value of 7000 milliseconds is used.\n",
                      "operationId": "discovernfc",
                      "parameters": [
                          {
                              "name": "nfcUuid",
                              "in": "path",
                              "description": "The uuid of the NFC code touch which will be set to learning mode. If this parameter is not passed on, then it will only create the user from the passed on body",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "nfcUuid"
                              }
                          },
                          {
                              "name": "timeout",
                              "in": "query",
                              "description": "Value in milliseconds for how long the NFC code touch should stay in learning mode. If not passed on, default value is used. Default = 7000.",
                              "required": false,
                              "schema": {
                                  "type": "integer",
                                  "example": 7000
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully received NFC tag",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/discovernfc/1e052949-03a5-4ef2-ffffbb105e80296f"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "Learned NFC tag ID.",
                                                          "example": "04 1A 63 BA 81 5E 80 00"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/configureuser/1e052949-03a5-4ef2-ffffbb105e80296f"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "A message describing the error.",
                                                          "example": "NFC learn failure"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "400"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/io/{nfcUuid}/output/{outputNr}": {
                  "get": {
                      "tags": [
                          "Door Opening"
                      ],
                      "summary": "Sends an impuls to the specific output on the NFC code touch block",
                      "description": "Sends an impuls to the specific output on the NFC code touch block, for example to open a door.",
                      "operationId": "dooropenunsec",
                      "parameters": [
                          {
                              "name": "nfcUuid",
                              "in": "path",
                              "description": "The UUID of the NFC code touch on which the output will be triggered.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "nfcUuid"
                              }
                          },
                          {
                              "name": "outputNr",
                              "in": "path",
                              "description": "The output number to trigger. Output number can be 1-6.",
                              "required": true,
                              "schema": {
                                  "type": "integer",
                                  "example": 1
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully sent impuls to output.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e052949-03a5-4ef2-ffffbb105e80296f/output/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "Indicates the output that was triggered.",
                                                          "example": "output/1"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message. Possible errors:\n- 500: NFC code touch uses interface password\n- 423: User is not permitted to execute the command at the moment / outputNr out of range\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e052949-03a5-4ef2-ffffbb105e80296f/output/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "423"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/ios/{hash}/{nfcUuid}/output/{outputNr}": {
                  "get": {
                      "tags": [
                          "Door Opening"
                      ],
                      "summary": "Sends an impuls to the specific output on the NFC code touch block. Secure Command.",
                      "description": "Sends an impuls to the specific output on the NFC code touch block, for example to open a door.<br><br>\n**Process to create a hash for the visualization password:**\n1. Request the visualization password from the user `{visuPw}`.\n2. Request the `key`, `salt`, and the hashing algorithm `{hashAlg}` from the Miniserver using the endpoint: `jdev/sys/getvisusalt/{user}`.\n   - `{user}`: The user whose visualization password has been entered.\n3. Create a hash using the specified `hashAlg` (e.g., SHA1, SHA256, etc.) of the format: `{visuPw}:{salt}` → `{visuPwHash}`.\n4. Generate an HMAC-SHA1 or HMAC-SHA256 hash using the uppercase `{visuPwHash}` and the `{key}` → `{hash}`.<br><br>\n\nMore info on the hashing algorithm can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14) under *General Info -> Secured Commands*\n",
                      "operationId": "dooropensec",
                      "parameters": [
                          {
                              "name": "hash",
                              "in": "path",
                              "description": "Hash of the visualization password",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "hash"
                              }
                          },
                          {
                              "name": "nfcUuid",
                              "in": "path",
                              "description": "The UUID of the NFC code touch on which the output will be triggered.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "nfcUuid"
                              }
                          },
                          {
                              "name": "outputNr",
                              "in": "path",
                              "description": "The output number to trigger. Output number can be 1-6.",
                              "required": true,
                              "schema": {
                                  "type": "integer",
                                  "example": 1
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully sent impuls to output.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e052949-03a5-4ef2-ffffbb105e80296f/output/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "Indicates the output that was triggered.",
                                                          "example": "output/1"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message. Possible errors:\n- 500: NFC code touch password hash incorrect\n- 423: User is not permitted to execute the command at the moment / outputNr out of range\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e052949-03a5-4ef2-ffffbb105e80296f/output/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "423"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/io/{ircUuid}/setComfortTemperature/{temp}": {
                  "get": {
                      "tags": [
                          "Room Moods"
                      ],
                      "summary": "Sets the temperature on the Intelligent Room Controller.",
                      "description": "Sets the comfort temperature on the Intelligent Room Controller. <br>**NOTE:** If the block doesn't use a single temperature, then this sets the comfort temperature for heating. \n",
                      "operationId": "roomcomforttemp",
                      "parameters": [
                          {
                              "name": "ircUuid",
                              "in": "path",
                              "description": "The UUID of the Intelligent Room Controller on which the temperature will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "ircUuid"
                              }
                          },
                          {
                              "name": "temp",
                              "in": "path",
                              "description": "The temperature to be set.",
                              "required": true,
                              "schema": {
                                  "type": "number",
                                  "example": 22.5
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully set temperature.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control command issued to set the comfort temperature.",
                                                          "example": "dev/sps/io/1e2b7d67-02e5-8843-ffffbb105e80296f/setComfortTemperature/20"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The get command performed with the temperature value.",
                                                          "example": "setcomforttemperature/20"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message. Possible errors:\n- 500: Intelligent Room Controller uses secure command\n- 423: User is not permitted to execute the command at the moment\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e2b7d67-02e5-8843-ffffbb105e80296f/setComfortTemperature/22.5"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/io/{ircUuid}/setComfortTemperatureCool/{temp}": {
                  "get": {
                      "tags": [
                          "Room Moods"
                      ],
                      "summary": "Sets the cooling comfort temperature on the Intelligent Room Controller.",
                      "description": "Sets the cooling comfort temperature on the Intelligent Room Controller. <br><br>**NOTE:** if the block doesn't use a single temperature, then this command is to be used. If it does use a single temperature, then the `/setComfortTemperature` command is to be used. \n",
                      "operationId": "roomcomforttempcool",
                      "parameters": [
                          {
                              "name": "ircUuid",
                              "in": "path",
                              "description": "The UUID of the Intelligent Room Controller on which the temperature will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "ircUuid"
                              }
                          },
                          {
                              "name": "temp",
                              "in": "path",
                              "description": "The temperature to be set.",
                              "required": true,
                              "schema": {
                                  "type": "number",
                                  "example": 14
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully set temperature.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control command issued to set the comfort temperature.",
                                                          "example": "dev/sps/io/1e2b7d67-02e5-8843-ffffbb105e80296f/setComfortTemperatureCool/14"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The get command performed with the temperature value.",
                                                          "example": "setcomforttemperaturecool/14"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message. Possible errors:\n- 500: Intelligent Room Controller uses secure command\n- 423: User is not permitted to execute the command at the moment\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e2b7d67-02e5-8843-ffffbb105e80296f/setComfortTemperatureCool/14"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/ios/{hash}/{ircUuid}/setComfortTemperature/{temp}": {
                  "get": {
                      "tags": [
                          "Room Moods"
                      ],
                      "summary": "Sets the temperature on the Intelligent Room Controller. Secure Command.",
                      "description": "Sets the comfort temperature on the Intelligent Room Controller. <br>This is a secure command and requires a hash value of the visualization password. <br><br>**Process to create a hash for the visualization password:**\n1. Request the visualization password from the user `{visuPw}`.\n2. Request the `key`, `salt`, and the hashing algorithm `{hashAlg}` from the Miniserver using the endpoint: `jdev/sys/getvisusalt/{user}`.\n    - `{user}`: The user whose visualization password has been entered.\n3. Create a hash using the specified `hashAlg` (e.g., SHA1, SHA256, etc.) of the format: `{visuPw}:{salt}` → `{visuPwHash}`.\n4. Generate an HMAC-SHA1 or HMAC-SHA256 hash using the uppercase `{visuPwHash}` and the `{key}` → `{hash}`.<br><br>\n\nMore info on the hashing algorithm can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14) under *General Info -> Secured Commands*<br>**NOTE:** If the block doesn't use a single temperature, then this sets the comfort temperature for heating. \n",
                      "operationId": "roomcomforttempsecure",
                      "parameters": [
                          {
                              "name": "hash",
                              "in": "path",
                              "description": "Hash of the visualization password",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "hash"
                              }
                          },
                          {
                              "name": "ircUuid",
                              "in": "path",
                              "description": "The UUID of the Intelligent Room Controller on which the temperature will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "ircUuid"
                              }
                          },
                          {
                              "name": "temp",
                              "in": "path",
                              "description": "The temperature to be set.",
                              "required": true,
                              "schema": {
                                  "type": "number",
                                  "example": 22.5
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully set temperature.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control command issued to set the comfort temperature.",
                                                          "example": "dev/sps/ios/{hash}/1e2b7d67-02e5-8843-ffffbb105e80296f/setComfortTemperature/20"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The get command performed with the temperature value.",
                                                          "example": "setcomforttemperature/20"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message. Possible errors:\n- 500: Intelligent Room Controller visualization password hash incorrect\n- 423: User is not permitted to execute the command at the moment\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e2b7d67-02e5-8843-ffffbb105e80296f/setComfortTemperature/22.5"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/ios/{hash}/{ircUuid}/setComfortTemperatureCool/{temp}": {
                  "get": {
                      "tags": [
                          "Room Moods"
                      ],
                      "summary": "Sets the cooling comfort temperature on the Intelligent Room Controller. Secure Command.",
                      "description": "Sets the cooling comfort temperature on the Intelligent Room Controller. <br>This is a secure command and requires a hash value of the visualization password. <br><br>**Process to create a hash for the visualization password:**\n1. Request the visualization password from the user `{visuPw}`.\n2. Request the `key`, `salt`, and the hashing algorithm `{hashAlg}` from the Miniserver using the endpoint: `jdev/sys/getvisusalt/{user}`.\n    - `{user}`: The user whose visualization password has been entered.\n3. Create a hash using the specified `hashAlg` (e.g., SHA1, SHA256, etc.) of the format: `{visuPw}:{salt}` → `{visuPwHash}`.\n4. Generate an HMAC-SHA1 or HMAC-SHA256 hash using the uppercase `{visuPwHash}` and the `{key}` → `{hash}`.<br><br>\n\nMore info on the hashing algorithm can be found [here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14) under *General Info -> Secured Commands*<br>**NOTE:** If the block doesn't use a single temperature, then this command is to be used. If it does use a single temperature, then the `/setComfortTemperature` secure command is to be used.\n",
                      "operationId": "roomcomforttempcoolsecure",
                      "parameters": [
                          {
                              "name": "hash",
                              "in": "path",
                              "description": "Hash of the visualization password",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "hash"
                              }
                          },
                          {
                              "name": "ircUuid",
                              "in": "path",
                              "description": "The UUID of the Intelligent Room Controller on which the temperature will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "ircUuid"
                              }
                          },
                          {
                              "name": "temp",
                              "in": "path",
                              "description": "The temperature to be set.",
                              "required": true,
                              "schema": {
                                  "type": "number",
                                  "example": 14
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully set temperature.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control command issued to set the comfort temperature.",
                                                          "example": "dev/sps/ios/{hash}/1e2b7d67-02e5-8843-ffffbb105e80296f/setComfortTemperatureCool/14"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The get command performed with the temperature value.",
                                                          "example": "setcomforttemperaturecool/14"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message. Possible errors:\n- 500: Intelligent Room Controller visualization password hash incorrect\n- 423: User is not permitted to execute the command at the moment\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e2b7d67-02e5-8843-ffffbb105e80296f/setComfortTemperatureCool/14"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/io/{audioPlayerUuid}/getmusicfavorites": {
                  "get": {
                      "tags": [
                          "Room Moods"
                      ],
                      "summary": "Retrieves the music favorites.",
                      "description": "Retrieves the music favorites.\n",
                      "operationId": "getmusicfavorites",
                      "parameters": [
                          {
                              "name": "audioPlayerUuid",
                              "in": "path",
                              "description": "The UUID of the Audio Player on which the first music favorite will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "audioPlayerUuid"
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully retrieved music favorites.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control command issued to set the comfort temperature.",
                                                          "example": "dev/sps/io/1e2bad81-03e2-7fac-ffffbb105e80296f/getmusicfavorites"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The list of music favorites and their play priority positions.",
                                                          "example": "{ \"favorites\": [{ \"priority\": 1, \"id\": 3, \"name\": \"Rock\" }, { \"priority\": 2, \"id\": 1, \"name\": \"Jazz\" }, { \"priority\": 3, \"id\": 4, \"name\": \"Pop\" }, { \"priority\": 4, \"id\": 5, \"name\": \"Hip-Hop\" }, { \"priority\": 5, \"id\": 2, \"name\": \"Classical\" }] }\n"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message.\n - 400: Audio Player has no favorites\n - 404: no Audio Player with given audioPlayerUuid found\n - 500: Audio Player uses visualization password\n \n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e2bad81-03e2-7fac-ffffbb105e80296f/getmusicfavorites"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The error response text.",
                                                          "example": "no music favorites"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "400"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/ios/{hash}/{audioPlayerUuid}/getmusicfavorites": {
                  "get": {
                      "tags": [
                          "Room Moods"
                      ],
                      "summary": "Retrieves the music favorites.",
                      "description": "Retrieves the music favorites. <br>This is a secure command and requires a hash value of the\nvisualization password. <br><br>**Process to create a hash for the\nvisualization password:**\n\n1. Request the visualization password from the user `{visuPw}`.\n\n2. Request the `key`, `salt`, and the hashing algorithm `{hashAlg}` from\nthe Miniserver using the endpoint: `jdev/sys/getvisusalt/{user}`.\n    - `{user}`: The user whose visualization password has been entered.\n3. Create a hash using the specified `hashAlg` (e.g., SHA1, SHA256,\netc.) of the format: `{visuPw}:{salt}` → `{visuPwHash}`.\n\n4. Generate an HMAC-SHA1 or HMAC-SHA256 hash using the uppercase\n`{visuPwHash}` and the `{key}` → `{hash}`.<br><br>\n\n\nMore info on the hashing algorithm can be found\n[here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14)\nunder *General Info -> Secured Commands*\n",
                      "operationId": "getmusicfavoritessecure",
                      "parameters": [
                          {
                              "name": "hash",
                              "in": "path",
                              "description": "Hash of the visualization password",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "hash"
                              }
                          },
                          {
                              "name": "audioPlayerUuid",
                              "in": "path",
                              "description": "The UUID of the Audio Player on which the first music favorite will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "audioPlayerUuid"
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully retrieved music favorites.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control command issued to set the comfort temperature.",
                                                          "example": "dev/sps/ios/{hash}/1e2bad81-03e2-7fac-ffffbb105e80296f/getmusicfavorites"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The list of music favorites and their play priority positions.",
                                                          "example": "{ \"favorites\": [{ \"priority\": 1, \"id\": 3, \"name\": \"Rock\" }, { \"priority\": 2, \"id\": 1, \"name\": \"Jazz\" }, { \"priority\": 3, \"id\": 4, \"name\": \"Pop\" }, { \"priority\": 4, \"id\": 5, \"name\": \"Hip-Hop\" }, { \"priority\": 5, \"id\": 2, \"name\": \"Classical\" }] }\n"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message.\n - 400: Audio Player has no favorites\n - 404: no Audio Player with given audioPlayerUuid found\n - 500: Audio Player visualization password incorrect\n \n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e2bad81-03e2-7fac-ffffbb105e80296f/getmusicfavorites"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The error response text.",
                                                          "example": "no music favorites"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "400"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/io/{audioPlayerUuid}/setmusicfavorite/{favoriteID}": {
                  "get": {
                      "tags": [
                          "Room Moods"
                      ],
                      "summary": "Sets the default played room music favorite.",
                      "description": "Sets the default played room music favorite.\n",
                      "operationId": "musicfavorite",
                      "parameters": [
                          {
                              "name": "audioPlayerUuid",
                              "in": "path",
                              "description": "The UUID of the Audio Player on which the first music favorite will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "audioPlayerUuid"
                              }
                          },
                          {
                              "name": "favoriteID",
                              "in": "path",
                              "description": "The ID of the music favorite to be set as first choice.",
                              "required": true,
                              "schema": {
                                  "type": "number",
                                  "example": 1
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully set music favorite.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control command issued to set the comfort temperature.",
                                                          "example": "dev/sps/io/1e2bad81-03e2-7fac-ffffbb105e80296f/setmusicfavorite/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The first favorite music choice ID.",
                                                          "example": 1
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message.\n - 404: no Audio Player with given audioPlayerUuid found\n - 500: Audio Player uses visualization password\n \n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e2bad81-03e2-7fac-ffffbb105e80296f/setmusicfavorite/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The error response text.",
                                                          "example": "favorite id value is invalid"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "400"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/ios/{hash}/{audioPlayerUuid}/setmusicfavorite/{favoriteID}": {
                  "get": {
                      "tags": [
                          "Room Moods"
                      ],
                      "summary": "Sets the default played room music favorite. Secure Command.",
                      "description": "Sets the default played room music favorite. <br>This is a secure command and requires a hash value of the\nvisualization password. <br><br>**Process to create a hash for the\nvisualization password:**\n\n1. Request the visualization password from the user `{visuPw}`.\n\n2. Request the `key`, `salt`, and the hashing algorithm `{hashAlg}` from\nthe Miniserver using the endpoint: `jdev/sys/getvisusalt/{user}`.\n    - `{user}`: The user whose visualization password has been entered.\n3. Create a hash using the specified `hashAlg` (e.g., SHA1, SHA256,\netc.) of the format: `{visuPw}:{salt}` → `{visuPwHash}`.\n\n4. Generate an HMAC-SHA1 or HMAC-SHA256 hash using the uppercase\n`{visuPwHash}` and the `{key}` → `{hash}`.<br><br>\n\n\nMore info on the hashing algorithm can be found\n[here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14)\nunder *General Info -> Secured Commands*\n",
                      "operationId": "musicfavoritesecure",
                      "parameters": [
                          {
                              "name": "hash",
                              "in": "path",
                              "description": "Hash of the visualization password",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "hash"
                              }
                          },
                          {
                              "name": "audioPlayerUuid",
                              "in": "path",
                              "description": "The UUID of the Audio Player on which the first music favorite will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "audioPlayerUuid"
                              }
                          },
                          {
                              "name": "favoriteID",
                              "in": "path",
                              "description": "The ID of the music favorite to be set as first choice.",
                              "required": true,
                              "schema": {
                                  "type": "number",
                                  "example": 1
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully set music favorite.",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control command issued to set the comfort temperature.",
                                                          "example": "dev/sps/ios/{hash}/1e2bad81-03e2-7fac-ffffbb105e80296f/setmusicfavorite/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The first favorite music choice ID.",
                                                          "example": 1
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message.\n - 404: no Audio Player with given audioPlayerUuid found\n - 500: Audio Player visualization password hash incorrect\n \n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e2bad81-03e2-7fac-ffffbb105e80296f/setmusicfavorite/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The error response text.",
                                                          "example": "favorite id value is invalid"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "400"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/io/{roomstatusUuid}/status": {
                  "get": {
                      "tags": [
                          "Room Status"
                      ],
                      "summary": "Retrieves the current Room Status id.",
                      "description": "Retrieves the current Room Status id. <br><br>\nThe mappings of the ids to the status outputs can be found in the **LOXAPP** (Structure File), which you can access ex.:*http://addressOfYourMiniserver/data/LoxApp3.json*. By searching in \"controls\" for the name of your Room Status block you will find its properties and in the field *details->outputs* will be the status id mappings.\n",
                      "operationId": "roomstatus",
                      "parameters": [
                          {
                              "name": "roomstatusUuid",
                              "in": "path",
                              "description": "The UUID of the Room Status block from which the status should be retrieved.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "roomstatusUuid"
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully retrieved current room status.<br>\n**Note:** In case \"value\": \"0\", this means no output currently active.\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e32568e-0343-5382-ffffbb105e80296f/status"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The current active room status id.",
                                                          "example": 1
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message.\n - 404: no Room Status block with given roomstatusUuid found\n - 500: Room Status block uses visualization password\n \n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e32568e-0343-5382-ffffbb105e80296f/status"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/ios/{hash}/{roomstatusUuid}/status": {
                  "get": {
                      "tags": [
                          "Room Status"
                      ],
                      "summary": "Retrieves the current Room Status id. Secure Command.",
                      "description": "Retrieves the current Room Status id.<br><br> The mappings of the ids to the status outputs can be found in the **LOXAPP** (Structure File), which you can access ex.:*http://addressOfYourMiniserver/data/LoxApp3.json*. By searching in \"controls\" for the name of your Room Status block you will find its properties and in the field *details->outputs* will be the status id mappings. <br><br>This is a secure command and requires a hash value of the\nvisualization password. <br><br>**Process to create a hash for the\nvisualization password:**\n\n1. Request the visualization password from the user `{visuPw}`.\n\n2. Request the `key`, `salt`, and the hashing algorithm `{hashAlg}` from\nthe Miniserver using the endpoint: `jdev/sys/getvisusalt/{user}`.\n    - `{user}`: The user whose visualization password has been entered.\n3. Create a hash using the specified `hashAlg` (e.g., SHA1, SHA256,\netc.) of the format: `{visuPw}:{salt}` → `{visuPwHash}`.\n\n4. Generate an HMAC-SHA1 or HMAC-SHA256 hash using the uppercase\n`{visuPwHash}` and the `{key}` → `{hash}`.<br><br>\n\n\nMore info on the hashing algorithm can be found\n[here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14)\nunder *General Info -> Secured Commands*\n",
                      "operationId": "roomstatussecure",
                      "parameters": [
                          {
                              "name": "hash",
                              "in": "path",
                              "description": "Hash of the visualization password",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "hash"
                              }
                          },
                          {
                              "name": "roomstatusUuid",
                              "in": "path",
                              "description": "The UUID of the Audio Player on which the first music favorite will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "roomstatusUuid"
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully retrieved current room status.<br>\n**Note:** In case \"value\": \"0\", this means no output currently active.\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "description": "Contains the control information and response details.",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e32568e-0343-5382-ffffbb105e80296f/status"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "description": "The current active room status id.",
                                                          "example": 1
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP response code indicating the status of the request.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message.\n - 404: no Room Status block with given roomstatusUuid found\n - 500: Room Status block visualization password hash incorrect\n \n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e32568e-0343-5382-ffffbb105e80296f/status"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/io/{roomstatusUuid}/{idToActivate}": {
                  "get": {
                      "tags": [
                          "Room Status"
                      ],
                      "summary": "Sets a Room Status from the given id.",
                      "description": "Sets the Room Status to the given id. <br><br>\nThe mappings of the ids to the status outputs can be found in the **LOXAPP** (Structure File), which you can access ex.:*http://addressOfYourMiniserver/data/LoxApp3.json*. By searching in \"controls\" for the name of your Room Status block you will find its properties and in the field *details->outputs* will be the status id mappings.\n",
                      "operationId": "setroomstatus",
                      "parameters": [
                          {
                              "name": "roomstatusUuid",
                              "in": "path",
                              "description": "The UUID of the Room Status block from which the status should be retrieved.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "roomstatusUuid"
                              }
                          },
                          {
                              "name": "idToActivate",
                              "in": "path",
                              "description": "The status id to be set.",
                              "required": true,
                              "schema": {
                                  "type": "integer",
                                  "example": 1
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully set room status.\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e32568e-0343-5382-ffffbb105e80296f/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": "1"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message.\n - 404: no Room Status block with given roomstatusUuid found\n - 500: Room Status block uses visualization password (\"value\": \"\")\n - 500: Invalid status id (ex.: \"value\":\"17\")\n \n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/io/1e32568e-0343-5382-ffffbb105e80296f/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              },
              "/ios/{hash}/{roomstatusUuid}/{idToActivate}": {
                  "get": {
                      "tags": [
                          "Room Status"
                      ],
                      "summary": "Sets a Room Status from the given id. Secure Command.",
                      "description": "Sets the Room Status to the given id.<br><br> The mappings of the ids to the status outputs can be found in the **LOXAPP** (Structure File), which you can access ex.:*http://addressOfYourMiniserver/data/LoxApp3.json*. By searching in \"controls\" for the name of your Room Status block you will find its properties and in the field *details->outputs* will be the status id mappings. <br><br>This is a secure command and requires a hash value of the\nvisualization password. <br><br>**Process to create a hash for the\nvisualization password:**\n\n1. Request the visualization password from the user `{visuPw}`.\n\n2. Request the `key`, `salt`, and the hashing algorithm `{hashAlg}` from\nthe Miniserver using the endpoint: `jdev/sys/getvisusalt/{user}`.\n    - `{user}`: The user whose visualization password has been entered.\n3. Create a hash using the specified `hashAlg` (e.g., SHA1, SHA256,\netc.) of the format: `{visuPw}:{salt}` → `{visuPwHash}`.\n\n4. Generate an HMAC-SHA1 or HMAC-SHA256 hash using the uppercase\n`{visuPwHash}` and the `{key}` → `{hash}`.<br><br>\n\n\nMore info on the hashing algorithm can be found\n[here](https://www.loxone.com/wp-content/uploads/datasheets/CommunicatingWithMiniserver.pdf#page=14)\nunder *General Info -> Secured Commands*\n",
                      "operationId": "setroomstatussecure",
                      "parameters": [
                          {
                              "name": "hash",
                              "in": "path",
                              "description": "Hash of the visualization password",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "hash"
                              }
                          },
                          {
                              "name": "roomstatusUuid",
                              "in": "path",
                              "description": "The UUID of the Audio Player on which the first music favorite will be set.",
                              "required": true,
                              "schema": {
                                  "type": "string",
                                  "example": "roomstatusUuid"
                              }
                          },
                          {
                              "name": "idToActivate",
                              "in": "path",
                              "description": "The status id to be set.",
                              "required": true,
                              "schema": {
                                  "type": "integer",
                                  "example": 1
                              }
                          }
                      ],
                      "responses": {
                          "200": {
                              "description": "Successfully set room status.\n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e32568e-0343-5382-ffffbb105e80296f/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": "1"
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "200"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          },
                          "default": {
                              "description": "Error response with code and message.\n - 404: no Room Status block with given roomstatusUuid found\n - 500: Room Status block visualization password hash incorrect (\"value\": \"\")\n - 500: Invalid status id (ex.: \"value\":\"17\")\n \n",
                              "content": {
                                  "application/json": {
                                      "schema": {
                                          "type": "object",
                                          "properties": {
                                              "LL": {
                                                  "type": "object",
                                                  "properties": {
                                                      "control": {
                                                          "type": "string",
                                                          "description": "The control path related to the operation.",
                                                          "example": "dev/sps/ios/{hash}/1e32568e-0343-5382-ffffbb105e80296f/1"
                                                      },
                                                      "value": {
                                                          "type": "string",
                                                          "example": ""
                                                      },
                                                      "Code": {
                                                          "type": "string",
                                                          "description": "The HTTP status code returned as a string.",
                                                          "example": "500"
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      },
                      "security": [
                          {
                              "hospitality_auth": []
                          },
                          {
                              "bearer_auth": []
                          }
                      ]
                  }
              }
          },
          "components": {
              "schemas": {
                  "UserConfiguration": {
                      "required": [
                          "name"
                      ],
                      "type": "object",
                      "properties": {
                          "name": {
                              "type": "string",
                              "description": "When it comes to users, this is the username that is used to login via our app."
                          },
                          "userid": {
                              "type": "string",
                              "description": "May be empty, this is the id that will be returned by the NFC permission block when granting access. In Loxone Config, this field is configured as NFC Code Touch ID"
                          },
                          "isAdmin": {
                              "type": "boolean",
                              "description": "Indicates if the user has administrative rights on the Miniserver."
                          },
                          "changePassword": {
                              "type": "boolean",
                              "description": "Specifies whether or not a user is allowed to change its passwords from within the apps."
                          },
                          "masterAdmin": {
                              "type": "boolean",
                              "description": "In config versions prior to 11.0, there used to be one main admin, which could not be removed."
                          },
                          "userRights": {
                              "type": "integer",
                              "format": "int32",
                              "description": "The rights or permissions associated with the user."
                          },
                          "password": {
                              "type": "string",
                              "description": "Hash of the user password to be set. More details on how to set create the hash can be found in the User Configuration section."
                          },
                          "visupassword": {
                              "type": "string",
                              "description": "Hash of the user visualization password to be set. More details on how to set create the hash can be found in the User Configuration section."
                          },
                          "scorePWD": {
                              "type": "integer",
                              "format": "int32",
                              "description": "Provides/sets info on how strong a password is"
                          },
                          "scoreVisuPWD": {
                              "type": "integer",
                              "format": "int32",
                              "description": "Same like scorePWD but for visualization passwords. (additional password that has to be entered, even tough the connection itself is already authenticated - e.g. for disarming a burglar alarm)."
                          },
                          "userState": {
                              "type": "integer",
                              "format": "int32",
                              "description": "Indicates whether or not a user is active and may log in or get access (depending on the rights granted in config permission management). "
                          },
                          "usergroups": {
                              "type": "array",
                              "description": "An array containing an object for each group the user should be part of. Each group object contains the UUID of the group.",
                              "items": {
                                  "type": "string"
                              }
                          },
                          "nfcTags": {
                              "type": "array",
                              "description": "An array with an entry for each NFC tag associated with this user. Each tag is represented by a name and the NFC tag id",
                              "items": {
                                  "type": "string"
                              }
                          },
                          "keycodes": {
                              "type": "array",
                              "description": "Even though this is an array of string codes, currently there is only one keycode for each user. The only attribute of each keycode object is the code itself. It should be a numeric code (0-9) with 2-8 digits passed on as a string, which will be hashed once stored.",
                              "items": {
                                  "type": "string"
                              }
                          }
                      }
                  }
              },
              "securitySchemes": {
                  "hospitality_auth": {
                      "type": "http",
                      "scheme": "basic"
                  },
                  "bearer_auth": {
                      "type": "http",
                      "scheme": "bearer",
                      "bearerFormat": "JWT"
                  }
              }
          }
      },
  "customOptions": {}
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}
