# Step-by-Step Guide for Bot Creation and Configuration

This guide describes the necessary steps to create the Telegram bot, set up the required channels and groups, and configure the environment variables.

## 1. Create Bot with BotFather

1.  Open Telegram and search for the user `@BotFather`.
2.  Start a chat with BotFather by sending `/start`.
3.  Create a new bot by sending `/newbot`.
4.  Follow BotFather's instructions to set a name and username for your bot. The username must end with `bot` (e.g., `MyAwesomeBot`).
5.  BotFather will send you an **API token** for your bot. **Keep this token safe!** You will need it later for the `TELEGRAM_TOKEN` environment variable.

## 2. Add Bot Commands

1.  In the chat with BotFather, send `/mybots`.
2.  Select your newly created bot from the list.
3.  Click on "Edit Bot".
4.  Click on "Edit Commands".
5.  Send the following list of commands to BotFather (each command on a new line or separated by spaces, as indicated by BotFather):

    ```
    search - Search for an event
    submit - Submit a new event
    edit - Edit an existing event
    rules - Read our rules
    support - Get support
    ```

## 3. Create Channel and Add Bot as Admin

1.  Create a new Telegram channel (Type: Public or Private, as needed).
2.  Go to Channel Settings -> Administrators -> Add Administrator.
3.  Search for your bot's **username** and add it as an administrator.
4.  Ensure the bot has at least the permission to post messages.
5.  Note down the channel's **username** (e.g., `@myChannelName`) or the **Channel ID**.
    - **Username:** For public channels.
    - **Channel ID:** For private channels (or public ones too). You can find the ID in several ways:
      - **Telegram Web:** Open the channel in the Telegram Web client (web.telegram.org). The ID is in the URL after the `#` sign (e.g., `https://web.telegram.org/a/#-1001234567890`). The required ID is the number after the `-` or `-100`.
      - **Bots:** Forward a message from the channel to a bot like `@JsonDumpBot` or `@RawDataBot`. Look for the `id` in the `forward_from_chat` field in the response.
    - This ID or username is needed for the `CHANNEL_USERNAME` environment variable.

## 4. Create Admin Group and Add Bot

1.  Create a new Telegram group. This group is used for managing the bot and notifying administrators.
2.  Add your bot as a member to this group.
3.  Note down the **Chat ID** of this group. You can find the ID in several ways:
    - **Telegram Web:** Open the group in the Telegram Web client (web.telegram.org). The ID is in the URL after the `#` sign (e.g., `https://web.telegram.org/a/#-123456789`). The required ID is the negative number.
    - **Bots:** Add a bot like `@JsonDumpBot` or `@RawDataBot` to the group and send any message. Look for `chat` -> `id` in the bot's JSON response. Remove the bot from the group afterwards.
    - This ID (often a negative number) is needed for the `ADMIN_CHAT_ID` environment variable.

## 5. Create Discussion Group and Link to Channel

1.  Create another new Telegram group. This group will be used for comments on the channel posts.
2.  Go to the settings of your channel (from Step 3).
3.  Select "Discussion".
4.  Choose the discussion group you just created to link it with the channel.

## 6. Configure Environment Variables

For the bot to work correctly, you need to set the following environment variables in your hosting environment or in a `.env` file in the project directory:

- **`TELEGRAM_TOKEN`**: The API token you received from BotFather in Step 1.
  ```
  TELEGRAM_TOKEN='YOUR_BOT_TOKEN_HERE'
  ```
- **`ADMIN_CHAT_ID`**: The Chat ID of the admin group from Step 4 (the negative number).
  ```
  ADMIN_CHAT_ID='YOUR_ADMIN_GROUP_ID_HERE' // e.g., -4682774459
  ```
- **`CHANNEL_USERNAME`**: The username (for public channels, e.g., `@myChannelName`) or the Chat ID (for private channels, e.g., `-1002573860374`) of the channel from Step 3. If using the username, make sure to include the `@` symbol. If using the ID, ensure it's passed as a number or string (starting with `-100...`).
  ```
  CHANNEL_USERNAME='@yourChannelNameOrID' // e.g., -1002573860374 or @myChannel
  ```

Ensure the values are stored correctly in the environment variables. Note that IDs for groups and channels are often negative numbers.
