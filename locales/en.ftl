# /src/bot.ts
bot-entry-choose-language = Please choose a language:
bot-entry-language-set = Language set to { $locale }\.
bot-entry-language-english = English
bot-entry-language-german = German
bot-entry-yes = { $icon } Yes
bot-entry-no = { $icon } No
bot-entry-submit-cancelled = { $icon } Submission cancelled\.
bot-entry-event-published = { $icon } The event *{ $title }* was successfully published in the channel { $channel }\!
bot-entry-start-search = Start search
bot-entry-search-event = { $icon } Event Search
bot-entry-submit-event = { $icon } *Submit your Event*
bot-entry-event-edit-command = Would you like to edit one of your events?
bot-entry-edit-cancelled = { $icon } Editing cancelled\.

# /src/bot.ts - Support Command
msg-support-title = { $icon } Support & Contact
msg-support-intro = If you have questions or need help, you can reach us as follows:
msg-support-email = { $icon } *Email:* { $email }
msg-support-telegram = { $icon } *Telegram:* @{ $user }
msg-support-no-contact = { $icon } Currently, no direct contact options are configured\.

msg-conversation-cancelled-btn = { $icon } Cancel
msg-conversation-cancelled = The conversation has been cancelled\.
msg-conversation-skipped = The conversation has been skipped\.

# error handling bot api
bot-entry-error-bad-request = Your request contains invalid data \(Error code: { $errorcode }\)\. Please check your input and try again\.
bot-entry-error-unauthorized = Authorization failed \(Error code: { $errorcode }\)\. Please restart the bot or contact support\.
bot-entry-error-forbidden = You do not have permission to perform this action. (Error code: { $errorcode })
bot-entry-error-not-found = The requested resource was not found\. \(Error code: { $errorcode }\)
bot-entry-error-flood-limit = Sorry, I am currently overloaded \(Error code: { $errorcode }\)\. Please try again in a few minutes\.
bot-entry-error-internal = An internal error has occurred \(Error code: { $errorcode }\)\. Please try again later\.
bot-entry-error-network = I was unable to connect to the Telegram servers\. Please check your internet connection\.
bot-entry-error-unknown = An unknown error has occurred \(Error code\: { $errorcode }\)\. Please try again later or contact support\.
bot-entry-error-rate-limit-exceeded = Please don't send so many requests at once\. Try again in a few seconds\.

# /src/utils/eventMessageFormatter.ts
msg-format-edited-event-for-review = { $icon } *Edited event*
msg-format-new-event-submitted = { $icon } *New event*
msg-format-submitted-by = { $icon } { $submittedBy }
msg-format-event-index = { $icon } *Event { $index } from { $total }*
msg-format-event-title = { $icon } *{ $title }*
msg-format-event-location = { $icon } { $location }
msg-format-event-entry-date = { $icon } *Entry:* { $entryDate }
msg-format-event-start = { $icon } *Start:* { $start }
msg-format-event-end = { $icon } *End:* { $end }
msg-format-event-category = { $icon } { $category }
msg-format-event-updated-count = { $icon } *Updated:* { $updatedCount } from { $totalCount } on { $updatedAt }
msg-format-event-description = { $icon } 
    { $description }
msg-format-event-links = { $icon } { $links }
msg-format-event-submittedBy = *Submited by:* { $submittedBy }
msg-format-event-for-day = *Events for { $date }*
msg-format-event-submittedBy-anonymous = *Submitted by:* anonymous
msg-format-event-group-link = { $icon } { $groupLink }

# /src/conversations/rejectEventConversation.ts
msg-reject-event-no-eventid-found = An error occurred\. No event ID found\.
msg-reject-event-not-found = Event not found\.
msg-reject-event-rejection-reason = Please enter the reason for rejection:
msg-reject-event-rejection-reason-notification = 
    { $icon } Your event *{ $eventTitle }* has been rejected\.

    Reason: { $rejectionReason }
msg-reject-event-send-msg-user-error = Error sending message to user:
msg-reject-event-rejection-success = { $eventTitle } has been rejected and the reason has been communicated to the user\.

# /src/conversations/submitEventConversation.ts 
msg-submit-event-title = { $icon } Please enter the *title* for the event:
msg-submit-event-title-too-long = { $icon } The title may not exceed 80 characters\!
msg-submit-event-description = { $icon } Please enter the *description* for the event \(max\. 405 characters\)
msg-submit-event-description-too-long = { $icon } The description may not exceed 405 characters\!
msg-submit-event-location = { $icon } *Event Location* \(min\. 3 \- max\. 90 characters\):
msg-submit-event-location-invalid = { $icon } The event location must be between 3 and 90 characters\!
msg-submit-event-entry-date = { $icon } *Entry from* \(Format: { $date }\):
msg-submit-event-entry-date-invalid = { $icon } Invalid entry date\! Please use the format { $date }\.
msg-submit-event-entry-date-future = { $icon } The entry date must be in the future\!
msg-submit-event-start-date = { $icon } *Start date & start time* \(Format: { $date }\):
msg-submit-event-start-date-invalid = { $icon } Invalid start date\! Please use the format { $date }\.
msg-submit-event-start-date-future = { $icon } The start date must be in the future\!
msg-submit-event-start-date-before-entry = { $icon } The start date must be after the entry date\!
msg-submit-event-end-date = { $icon } *End date and end time* \(Format: { $date }\):
msg-submit-event-end-date-invalid = { $icon } Invalid end date\! Please use the format { $date }\.
msg-submit-event-end-date-future = { $icon } The end date must be in the future\!
msg-submit-event-end-date-before-start = { $icon } The end date must be after the start date\!
msg-submit-event-date-summary = { $icon } *Summary:*
    Entry: { $entryDate }
    Start: { $startDate }
    End: { $endDate }
msg-submit-event-date-summary-confirm = { $icon } Confirm
msg-submit-event-date-summary-reset = { $icon } Enter again
msg-submit-event-dates-saved = { $icon } Date saved
msg-submit-event-dates-reset = { $icon } Input reset
msg-submit-event-category = { $icon } *Category* \(max\. 3\):
msg-submit-event-category-reset-btn = { $icon } Reset
msg-submit-event-category-done-btn = { $icon } Done
msg-submit-event-category-selected = { $icon } Selected categories: { $categories }
msg-submit-event-category-added = { $category } added\!
msg-submit-event-category-removed = { $category } removed\!
msg-submit-event-category-max-reached = { $icon } Maximum { $max } categories allowed\!
msg-submit-event-category-empty = { $icon } Please select at least one category\!
msg-submit-event-category-reset = { $icon } Category selection has been reset\. Please select again\.
msg-submit-event-category-saved = { $icon } Categories saved\!
msg-submit-event-links = { $iconPensil } Please enter max\. 1 link \(max\. 40 characters\)

    { $iconTip } Tip: Use a URL shortener to shorten your link\. Recommendation: https://fckaf\.de
msg-submit-event-link-too-long = { $icon } The link may not exceed 40 characters\!
msg-submit-event-image = { $icon } Please send an *image* for the event \(PNG or JPG\):
msg-submit-event-image-invalid = { $icon } Invalid input\. Please send an image or skip this item\.
msg-submit-event-image-error = { $icon } Error downloading the image\.
msg-submit-event-success-pending = { $icon } Thank you\! Your event has been sent to the admins for review\.
msg-submit-event-success-published = { $icon } Thank you\! Your event has been successfully published in the channel\.
msg-submit-event-links-no-btn = { $icon } Skip link entry
msg-submit-event-image-no-btn = { $icon } Skip image upload
msg-submit-event-btn-cancel = { $icon } Cancel
msg-submit-event-group-link = { $icon } Would you like to add a group for your event?
msg-submit-event-group-link-error = { $icon } The link must be a valid URL\.

# /src/conversations/editEventConversation.ts
msg-edit-event-user-not-found = User not found\.
msg-edit-event-no-approved-events-found = You have no approved events in the future available for editing\.
msg-edit-event-edit-limit-reached = You have reached the limit for editing your event\.
msg-edit-event-select-event-to-edit = Select the event you want to edit:
msg-edit-event-event-data = Current content of the event:
msg-edit-event-field = Do you want to change *{ $field }*?
msg-edit-event-field-yes = { $icon } Yes
msg-edit-event-field-no = { $icon } No
msg-edit-event-new-title = Please enter a **new title** for the event \(max\. 85 characters\):
msg-edit-event-new-title-too-long = { $icon } The title is too long\. Please enter a title with a maximum of 85 characters\.
msg-edit-event-new-description = Please enter a *new description* for the event \(max\. 550 characters\):
msg-edit-event-new-description-too-long = { $icon } The description is too long\. Please enter a description with a maximum of 405 characters\.
msg-edit-event-new-entry-date = New *entry time* \(format: { $date }\):
msg-edit-event-wrong-date-format = { $icon } Incorrect date format\. Please enter the date in the format { $date }\.
msg-edit-event-new-entry-date-future = { $icon } The entry date must be in the future\.
msg-edit-event-new-start-after-entry = { $icon } The start date must be after the entry date\.
msg-edit-event-new-startdate = New *start date* \(format: { $date }\):
msg-edit-event-new-enddate = New *end date* \(format: { $date }\):
msg-edit-event-new-end-after-start = { $icon } The end date must be after the start date\.
msg-edit-event-new-location = Please enter a *new location* for the event \(min\. 3 characters\):
msg-edit-event-new-location-to-short = { $icon } The location is too short\. Please enter a location with at least 3 characters\.
msg-edit-event-new-category = Select the new categories:
msg-edit-event-cat-saved = Categories saved!
msg-edit-event-min-cat = Please select at least one category!
msg-edit-event-cat-reset = Categories reset!
msg-edit-event-cat-count-selection = { $selection } added!
msg-edit-event-cat-count-deselection = { $deselection } removed!
msg-edit-event-output-selected-cats = Selected categories: { $selectedCategories }
msg-edit-event-cat-reset-btn = { $icon } Reset
msg-edit-event-cat-done-btn = { $icon } Done
msg-edit-event-new-links = Bitte gib max\. 1 Link an \(max\. 40 Zeichen\)
msg-edit-event-new-image = Please send a *new image* for the event \(PNG or JPG\):
msg-edit-event-image-download-error = Error downloading the image\.
msg-edit-event-image-invalid-input = Invalid input\. Please send an image.
msg-edit-event-remaining-edits = { $remainingEdits } edits left
msg-edit-event-remaining-edits-overview = { $title } \({ $remainingEdits } edits left\)
msg-edit-event-changes = Summary of changes:
msg-edit-event-dates-summary = { $icon } **Summary:**
    Entry: { $entryDate }
    Start: { $startDate }
    End: { $endDate }
msg-edit-event-summary-error-by-sending-image = Error sending the event image\.
msg-edit-event-summary-save-changes = Do you want to save the changes?
msg-edit-event-save-review = Your changes have been saved\. The event is now under review\.
msg-edit-event-save = Your changes have been saved\. The event has been updated\.
msg-edit-event-changes-reject = Changes rejected\. The event has not been updated\.
msg-edit-event-field-edit = Do you want to edit the field: { $fieldName }?
msg-edit-event-dates-confirmed ={ $icon } Dates saved!
msg-edit-event-dates-reset = { $icon } Input reset!
msg-edit-event-error = { $icon } Error processing the event\.
msg-edit-event-dates-error = { $icon } Error processing the dates\.
msg-edit-event-btn-next = { $icon } Next
msg-edit-event-new-group-link = { $icon } Please enter a new group link for the event:

msg-edit-event-btn-cancel  = { $icon } Cancel
msg-edit-event-title-error = { $icon } Error processing the title\.
msg-edit-event-group-link-error = { $icon } Error processing the group link\.

# Field names
msg-edit-event-field-title = Title
msg-edit-event-field-description = Description
msg-edit-event-field-location = Location
msg-edit-event-field-date = Date and Time
msg-edit-event-field-category = Category
msg-edit-event-field-links = Links
msg-edit-event-field-groupLink = Group Link
msg-edit-event-field-imageBase64 = Image

# Categories
msg-cat-dance = Dance
msg-cat-music = Music
msg-cat-concert = Concert
msg-cat-entertainment = Entertainment
msg-cat-politics = Politics
msg-cat-theatre = Theatre
msg-cat-sport = Sport
msg-cat-education = Education
msg-cat-eat-drink = Eat & Drink
msg-cat-art = Art
msg-cat-cinema = Cinema
msg-cat-festival = Festival
msg-cat-exhibition = Exhibition
msg-cat-literature = Literature
msg-cat-market = Market
msg-cat-workshop = Workshop
msg-cat-lecture = Lecture
msg-cat-other = Other

# /src/services/eventService.ts
msg-service-event-approval = Accept
msg-service-event-rejection = Reject
msg-service-event-not-found = Event not found\.
msg-service-event-already-published = Event has already been published\.
msg-service-event-status-unknown = Unknown event status\.
msg-service-event-approval-error = Error approving the event\.
msg-service-event-rejection-error = Error rejecting the event\.
msg-service-event-rejection-entered = Entered rejectEventConversation for Event ID=\{ $eventId \}\.
msg-service-event-publication-error = Error publishing the event\.
msg-service-event-published = { $icon } The event \"\{ $eventTitle \}\" was successfully published in channel \{ $channelUsername \}\!
msg-service-event-update-error = Error updating the event in the channel\.
msg-service-event-post-error = Error posting the event in the channel\.
msg-service-event-post-success = Event successfully published in the channel\.
msg-service-event-delete-error = Error deleting the old message in the channel\.
msg-service-event-edit-error = Error editing the message in the channel\.
msg-service-event-photo-send-error = Error sending the photo for the event\.
msg-service-event-text-send-error = Error sending the message for the event\.
msg-service-event-photo-post-success = Photo posted in channel for Event ID=\{ $eventId \}\, messageId=\{ $messageId \}\.
msg-service-event-text-post-success = Message posted in channel for Event ID=\{ $eventId \}\, messageId=\{ $messageId \}\.
msg-service-event-text-edit-success = Message edited in channel for Event ID=\{ $eventId \}\, messageId=\{ $messageId \}\.
msg-service-search-no-events = No events for \{ $dateText \}\.
msg-service-search-error = Error sending search results to user\.
msg-service-event-process-error = Error processing Event ID=\{ $eventId \}\.
msg-service-search-no-events = No events for { $dateText }\.
msg-service-search-error = { $icon } Error sending search results\.
msg-service-search-photo-error = { $icon } Error sending photo for Event ID={ $eventId }\.
msg-service-search-message-error = { $icon } Error sending message for Event ID={ $eventId }\.
msg-service-search-process-error = { $icon } Error processing Event ID={ $eventId }\.

# /src/conversations/searchEventConversation.ts
msg-search-event-title = { $icon } Choose a search option:
msg-search-event-date-format = { $icon } Please enter a date \(Format: { $format }\):
msg-search-event-date-cancel = { $icon } Date search cancelled\.
msg-search-event-date-invalid = { $icon } Invalid date format! Please use the format { $format }\.
msg-search-event-error = { $icon } An error occurred during the search\.
msg-search-event-options-error = { $icon } Error displaying search options\.
msg-search-event-invalid-choice = { $icon } Invalid selection\.
msg-search-event-choice-error = { $icon } Error processing the selection\.
msg-search-event-today-error = { $icon } Error searching for today's events\.
msg-search-event-tomorrow-error = { $icon } Error searching for tomorrow's events\.
msg-search-event-btn-today = { $icon } Today
msg-search-event-btn-tomorrow = { $icon } Tomorrow
msg-search-event-btn-specific = { $icon } Choose date
msg-search-event-btn-exit = { $icon } Exit
msg-search-event-btn-cancel = { $icon } Cancel
msg-search-event-exit = { $icon } Search ended\.
msg-search-event-cancel = { $icon } Search cancelled\.

msg-rules-notice = { $icon } **Important Notice:**\  
    1\. We reserve the right to delete events that do not align with our beliefs\.
    2\. We do not support events with sexist, racist, or generally discriminatory content\.
    3\. Our service is free of charge and operated exclusively by volunteers\.
    4\. Anyone attempting to gain an advantage by deleting and reposting their events will be banned\.
    5\. For technical reasons, we store your Telegram user ID when you submit events\. No other data is collected\. All data is stored on Telegram's servers, over which we have no control\.

# --- Delete Event Command ---
bot-entry-event-delete-command = Do you want to delete one of your events?
bot-entry-delete-cancelled = Deletion process cancelled\. { $icon }

# --- Delete Event Conversation ---
msg-delete-event-user-not-found = User ID not found. Deletion not possible\.
msg-delete-event-no-approved-events-found = You have no approved events that you could delete\.
msg-delete-event-select-event = Select the event you want to delete:
msg-delete-event-select-title = "{ $title }"
msg-delete-event-btn-cancel = Cancel { $icon }
msg-delete-event-cancelled = Deletion process cancelled\.
msg-delete-event-not-found-error = Error: Selected event not found\.
msg-delete-event-selected-details = You have selected the following event for deletion:
msg-delete-event-confirm-prompt = Are you sure you want to permanently delete the event "{ $eventTitle }"? The message in the channel will also be removed\.
msg-delete-event-btn-confirm = Yes, delete { $icon }
msg-delete-event-error = An error occurred while deleting the event\. { $icon }

# --- Event Service ---
msg-service-event-deleted-success = { $icon } The event "{ $eventTitle }" was successfully deleted\.
msg-service-event-deletion-error = { $icon } Error deleting the event\. Please try again later or contact support\.