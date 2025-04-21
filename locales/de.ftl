# /src/bot.ts
bot-entry-choose-language = Bitte wähle eine Sprache:
bot-entry-language-set = Sprache auf { $locale } gesetzt\.
bot-entry-language-english = Englisch
bot-entry-language-german = Deutsch
bot-entry-yes = { $icon } Ja
bot-entry-no = { $icon } Nein
bot-entry-submit-cancelled = { $icon } Einreichung abgebrochen\.
bot-entry-event-published = { $icon } Die Veranstaltung *{ $title }* wurde erfolgreich im Kanal { $channel } veröffentlicht\!
bot-entry-start-search = Suche starten
bot-entry-search-event = { $icon } Veranstaltungssuche
bot-entry-submit-event = { $icon } *Veranstaltung einreichen*
bot-entry-event-edit-command = Möchtest du eine deiner Veranstaltungen bearbeiten?
bot-entry-edit-cancelled = { $icon } Bearbeitung abgebrochen\.

msg-conversation-cancelled-btn = { $icon } Abbrechen
msg-conversation-cancelled = Das Gespräch wurde abgebrochen\.
msg-conversation-skipped = Das Gespräch wurde übersprungen\.

# Fehlerbehandlung Bot API
bot-entry-error-bad-request = Deine Anfrage enthält ungültige Daten \(Fehlercode: { $errorcode }\)\. Bitte überprüfe deine Eingaben und versuche es erneut\.
bot-entry-error-unauthorized = Autorisierung fehlgeschlagen \(Fehlercode: { $errorcode }\)\. Bitte starte den Bot neu oder kontaktiere den Support\.
bot-entry-error-forbidden = Du hast keine Berechtigung, diese Aktion auszuführen\. \(Fehlercode: { $errorcode }\)
bot-entry-error-not-found = Die angeforderte Ressource wurde nicht gefunden\. \(Fehlercode: { $errorcode }\)
bot-entry-error-flood-limit = Entschuldigung, ich bin derzeit überlastet \(Fehlercode: { $errorcode }\)\. Bitte versuche es in ein paar Minuten erneut\.
bot-entry-error-internal = Ein interner Fehler ist aufgetreten \(Fehlercode: { $errorcode }\)\. Bitte versuche es später erneut\.
bot-entry-error-network = Ich konnte keine Verbindung zu den Telegram-Servern herstellen\. Bitte überprüfe deine Internetverbindung\.
bot-entry-error-unknown = Ein unbekannter Fehler ist aufgetreten \(Fehlercode\: { $errorcode }\)\. Bitte versuche es später erneut oder kontaktiere den Support\.
bot-entry-error-rate-limit-exceeded = Bitte sende nicht so viele Anfragen auf einmal\. Versuche es in ein paar Sekunden erneut\.

# /src/utils/eventMessageFormatter.ts
msg-format-edited-event-for-review = { $icon } *Bearbeitete Veranstaltung*
msg-format-new-event-submitted = { $icon } *Neue Veranstaltung*
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
msg-format-event-submittedBy = *Eingereicht von:* { $submittedBy }
msg-format-event-for-day = *Veranstaltungen für { $date }*
msg-format-event-submittedBy-anonymous = *Eingereicht von:* anonym
msg-format-event-group-link = { $icon } { $groupLink }

# /src/conversations/rejectEventConversation.ts
msg-reject-event-no-eventid-found = Ein Fehler ist aufgetreten\. Keine Veranstaltungs-ID gefunden\.
msg-reject-event-not-found = Veranstaltung nicht gefunden\.
msg-reject-event-rejection-reason = Bitte gib den Grund für die Ablehnung ein:
msg-reject-event-rejection-reason-notification = 
    { $icon } Deine Veranstaltung *{ $eventTitle }* wurde abgelehnt\.

    Grund: { $rejectionReason }
msg-reject-event-send-msg-user-error = Fehler beim Senden der Nachricht an den Benutzer:
msg-reject-event-rejection-success = { $eventTitle } wurde abgelehnt und der Grund wurde dem Benutzer mitgeteilt\.

# /src/conversations/submitEventConversation.ts 
msg-submit-event-title = { $icon } Bitte gib den *Titel* für die Veranstaltung ein \(max\. 80 Zeichen\):
msg-submit-event-title-too-long = { $icon } Der Titel darf maximal 80 Zeichen lang sein\!
msg-submit-event-description = { $icon } Bitte gib die *Beschreibung* der Veranstaltung ein \(max\. 405 Zeichen\)
msg-submit-event-description-too-long = { $icon } Die Beschreibung darf maximal 405 Zeichen lang sein\!
msg-submit-event-location = { $icon } *Veranstaltungsort* \(min\. 3 \- max\. 90 Zeichen\):
msg-submit-event-location-invalid = { $icon } Der Veranstaltungsort muss zwischen 3 und 90 Zeichen lang sein\!
msg-submit-event-entry-date = { $icon } *Einlass ab* \(Format: { $date }\):
# Ausrufezeichen für MarkdownV2 escaped
msg-submit-event-entry-date-invalid = { $icon } Ungültiges Einlassdatum\! Bitte verwende das Format { $date }\.
msg-submit-event-entry-date-future = { $icon } Das Einlassdatum muss in der Zukunft liegen\!
msg-submit-event-start-date = { $icon } *Startdatum & Startzeit* \(Format: { $date }\):
# Ausrufezeichen für MarkdownV2 escaped
msg-submit-event-start-date-invalid = { $icon } Ungültiges Startdatum\! Bitte verwende das Format { $date }\.
msg-submit-event-start-date-future = { $icon } Das Startdatum muss in der Zukunft liegen\!
msg-submit-event-start-date-before-entry = { $icon } Das Startdatum muss nach dem Einlassdatum liegen\!
msg-submit-event-end-date = { $icon } *Enddatum und Endzeit* \(Format: { $date }\):
# Ausrufezeichen für MarkdownV2 escaped
msg-submit-event-end-date-invalid = { $icon } Ungültiges Enddatum\! Bitte verwende das Format { $date }\.
msg-submit-event-end-date-future = { $icon } Das Enddatum muss in der Zukunft liegen\!
msg-submit-event-end-date-before-start = { $icon } Das Enddatum muss nach dem Startdatum liegen\!
msg-submit-event-date-summary = { $icon } *Zusammenfassung:*
    Einlass: { $entryDate }
    Start: { $startDate }
    Ende: { $endDate }
msg-submit-event-date-summary-confirm = { $icon } Bestätigen
msg-submit-event-date-summary-reset = { $icon } Neu eingeben
msg-submit-event-dates-saved = { $icon } Termin gespeichert
msg-submit-event-dates-reset = { $icon } Eingabe zurückgesetzt
msg-submit-event-category = { $icon } *Kategorie* \(max\. 3\):
msg-submit-event-category-reset-btn = { $icon } Zurücksetzen
msg-submit-event-category-done-btn = { $icon } Fertig
msg-submit-event-category-selected = { $icon } Ausgewählte Kategorien: { $categories }
msg-submit-event-category-added = { $category } hinzugefügt\!
msg-submit-event-category-removed = { $category } entfernt\!
msg-submit-event-category-max-reached = { $icon } Maximal { $max } Kategorien erlaubt\!
msg-submit-event-category-empty = { $icon } Bitte wähle mindestens eine Kategorie\!
msg-submit-event-category-reset = { $icon } Kategorieauswahl wurde zurückgesetzt\. Bitte wähle erneut\.
msg-submit-event-category-saved = { $icon } Kategorien gespeichert\!
msg-submit-event-links = { $iconPensil } Bitte gib max\. 1 Link an \(max\. 40 Zeichen\)

    { $iconTip } Tipp: Nutze einen URL\-Shortener um deinen Link zu kürzen\. Empfehlung: https://fckaf\.de
msg-submit-event-link-too-long = { $icon } Der Link darf maximal 40 Zeichen lang sein\!
msg-submit-event-image = { $icon } Bitte sende ein *Bild* für die Veranstaltung \(PNG oder JPG\):
msg-submit-event-image-invalid = { $icon } Ungültige Eingabe\. Bitte sende ein Bild oder überspringe den Punkt\.
msg-submit-event-image-error = { $icon } Fehler beim Herunterladen des Bildes\.
msg-submit-event-success-pending = { $icon } Danke\! Deine Veranstaltung wurde zur Überprüfung an die Admins gesendet\.
msg-submit-event-success-published = { $icon } Danke\! Deine Veranstaltung wurde erfolgreich im Kanal veröffentlicht\.
msg-submit-event-links-no-btn = { $icon } Linkeingabe überspringen
msg-submit-event-image-no-btn = { $icon } Bild-Upload überspringen
msg-submit-event-btn-cancel = { $icon } Abbrechen
# Punkt am Ende für MarkdownV2 escaped
msg-submit-event-group-link = { $icon } Möchtest du eine Telegram Gruppe für dein Event hinterlegen? Teile den Link deiner Gruppe hier\.
msg-submit-event-group-link-error = { $icon } Fehler beim Senden des Gruppenlinks\.

# /src/conversations/editEventConversation.ts
msg-edit-event-user-not-found = Benutzer nicht gefunden\.
msg-edit-event-no-approved-events-found = Du hast keine genehmigten zukünftigen Veranstaltungen zur Bearbeitung\.
msg-edit-event-edit-limit-reached = Du hast das Limit für die Bearbeitung deiner Veranstaltung erreicht\.
msg-edit-event-select-event-to-edit = Wähle die Veranstaltung, die du bearbeiten möchtest:
msg-edit-event-event-data = Aktueller Inhalt der Veranstaltung:
msg-edit-event-field = Möchtest du *{ $field }* ändern?
msg-edit-event-field-yes = { $icon } Ja
msg-edit-event-field-no = { $icon } Nein
msg-edit-event-new-title = Bitte gib einen **neuen Titel** für die Veranstaltung ein \(max\. 85 Zeichen\):
msg-edit-event-new-title-too-long = { $icon } Der Titel ist zu lang\. Bitte gib einen Titel mit maximal 85 Zeichen ein\.
msg-edit-event-new-description = Bitte gib eine *neue Beschreibung* für die Veranstaltung ein \(max\. 550 Zeichen\):
msg-edit-event-new-description-too-long = { $icon } Die Beschreibung ist zu lang\. Bitte gib eine Beschreibung mit maximal 405 Zeichen ein\.
msg-edit-event-new-entry-date = Neue *Einlasszeit* \(Format: { $date }\):
msg-edit-event-wrong-date-format = { $icon } Falsches Datumsformat\. Bitte gib das Datum im Format { $date } ein\.
msg-edit-event-new-entry-date-future = { $icon } Das Einlassdatum muss in der Zukunft liegen\.
msg-edit-event-new-start-after-entry = { $icon } Das Startdatum muss nach dem Einlassdatum liegen\.
msg-edit-event-new-startdate = Neues *Startdatum* \(Format: { $date }\):
msg-edit-event-new-enddate = Neues *Enddatum* \(Format: { $date }\):
msg-edit-event-new-end-after-start = { $icon } Das Enddatum muss nach dem Startdatum liegen\.
msg-edit-event-new-location = Bitte gib einen *neuen Veranstaltungsort* ein \(min\. 3 Zeichen\):
msg-edit-event-new-location-to-short = { $icon } Der Veranstaltungsort ist zu kurz\. Bitte gib einen Ort mit mindestens 3 Zeichen ein\.
msg-edit-event-new-category = Wähle die neuen Kategorien:
msg-edit-event-cat-saved = Kategorien gespeichert\!
msg-edit-event-min-cat = Bitte wähle mindestens eine Kategorie\!
msg-edit-event-cat-reset = Kategorien zurückgesetzt\!
msg-edit-event-cat-count-selection = { $selection } hinzugefügt\!
msg-edit-event-cat-count-deselection = { $deselection } entfernt\!
msg-edit-event-output-selected-cats = Ausgewählte Kategorien: { $selectedCategories }
msg-edit-event-cat-reset-btn = { $icon } Zurücksetzen
msg-edit-event-cat-done-btn = { $icon } Fertig
msg-edit-event-new-links = Bitte gib max\. 1 Link an \(max\. 40 Zeichen\)
msg-edit-event-new-image = Bitte sende ein *neues Bild* für die Veranstaltung \(PNG oder JPG\):
msg-edit-event-image-download-error = Fehler beim Herunterladen des Bildes\.
msg-edit-event-image-invalid-input = Ungültige Eingabe\. Bitte sende ein Bild\.
msg-edit-event-remaining-edits = { $remainingEdits } Bearbeitungen übrig
msg-edit-event-remaining-edits-overview = { $title } \({ $remainingEdits } Bearbeitungen übrig\)
msg-edit-event-changes = Zusammenfassung der Änderungen:
msg-edit-event-dates-summary = { $icon } **Zusammenfassung:**
    Einlass: { $entryDate }
    Start: { $startDate }
    Ende: { $endDate }
msg-edit-event-summary-error-by-sending-image = Fehler beim Senden des Veranstaltungsbildes\.
msg-edit-event-summary-save-changes = Möchtest du die Änderungen speichern?
msg-edit-event-save-review = Deine Änderungen wurden gespeichert\. Die Veranstaltung wird nun überprüft\.
msg-edit-event-save = Deine Änderungen wurden gespeichert\. Die Veranstaltung wurde aktualisiert\.
msg-edit-event-changes-reject = Änderungen abgelehnt\. Die Veranstaltung wurde nicht aktualisiert\.
msg-edit-event-field-edit = Möchtest du das Feld "{ $fieldName }" bearbeiten?
msg-edit-event-dates-confirmed = { $icon } Termine gespeichert\!
msg-edit-event-dates-reset = { $icon } Eingabe zurückgesetzt\!
msg-edit-event-error = { $icon } Fehler bei der Verarbeitung der Veranstaltung\.
msg-edit-event-dates-error = { $icon } Fehler bei der Verarbeitung der Termine\.
msg-edit-event-btn-next = { $icon } Weiter
msg-edit-event-new-group-link = { $icon } Möchtest du den Gruppenlink ändern?

msg-edit-event-btn-cancel  = { $icon } Abbrechen
msg-edit-event-title-error = { $icon } Fehler bei der Verarbeitung des Titels\.
msg-edit-event-group-link-error = { $icon } Fehler beim Senden des Gruppenlinks\.

# /src/bot.ts - Support Command
msg-support-title = { $icon } Support & Kontakt
msg-support-intro = Wenn du Fragen hast oder Hilfe benötigst, kannst du uns wie folgt erreichen:
msg-support-email = { $icon } *E\-Mail:* { $email }
msg-support-telegram = { $icon } *Telegram:* { $user }
msg-support-no-contact = { $icon } Derzeit sind keine direkten Kontaktmöglichkeiten hinterlegt\.


# Feldnamen
msg-edit-event-field-title = Titel
msg-edit-event-field-description = Beschreibung
msg-edit-event-field-location = Veranstaltungsort
msg-edit-event-field-date = Datum und Uhrzeit
msg-edit-event-field-category = Kategorie
msg-edit-event-field-links = Links
msg-edit-event-field-groupLink = Gruppenlink
msg-edit-event-field-imageBase64 = Bild

# Kategorien
msg-cat-dance = Tanz
msg-cat-music = Musik
msg-cat-concert = Konzert
msg-cat-entertainment = Unterhaltung
msg-cat-politics = Politik
msg-cat-theatre = Theater
msg-cat-sport = Sport
msg-cat-education = Bildung
msg-cat-eat-drink = Essen & Trinken
msg-cat-art = Kunst
msg-cat-cinema = Kino
msg-cat-festival = Festival
msg-cat-exhibition = Ausstellung
msg-cat-literature = Literatur
msg-cat-market = Markt
msg-cat-workshop = Workshop
msg-cat-lecture = Vortrag
msg-cat-other = Sonstiges

# /src/services/eventService.ts
msg-service-event-approval = Annehmen
msg-service-event-rejection = Ablehnen
msg-service-event-not-found = Veranstaltung nicht gefunden\.
msg-service-event-already-published = Veranstaltung wurde bereits veröffentlicht\.
msg-service-event-status-unknown = Unbekannter Status der Veranstaltung\.
msg-service-event-approval-error = Fehler bei der Genehmigung der Veranstaltung\.
msg-service-event-rejection-error = Fehler beim Ablehnen der Veranstaltung\.
msg-service-event-rejection-entered = Eingetreten in rejectEventConversation für Veranstaltung ID=\{ $eventId \}\.
msg-service-event-publication-error = Fehler beim Veröffentlichen der Veranstaltung\.
msg-service-event-published = { $icon } Die Veranstaltung "{ $eventTitle }" wurde erfolgreich im Kanal { $channelUsername } veröffentlicht\!
msg-service-event-update-error = Fehler beim Aktualisieren der Veranstaltung im Kanal\.
msg-service-event-post-error = Fehler beim Posten der Veranstaltung im Kanal\.
msg-service-event-post-success = Veranstaltung erfolgreich im Kanal veröffentlicht\.
msg-service-event-delete-error = Fehler beim Löschen der alten Nachricht im Kanal\.
msg-service-event-edit-error = Fehler beim Bearbeiten der Nachricht im Kanal\.
msg-service-event-photo-send-error = Fehler beim Senden des Fotos für die Veranstaltung\.
msg-service-event-text-send-error = Fehler beim Senden der Nachricht für die Veranstaltung\.
msg-service-event-photo-post-success = Foto im Kanal gepostet für Veranstaltung ID=\{ $eventId \}\, messageId=\{ $messageId \}\.
msg-service-event-text-post-success = Nachricht im Kanal gepostet für Veranstaltung ID=\{ $eventId \}\, messageId=\{ $messageId \}\.
msg-service-event-text-edit-success = Nachricht im Kanal bearbeitet für Veranstaltung ID=\{ $eventId \}\, messageId=\{ $messageId \}\.
msg-service-event-process-error = Fehler beim Verarbeiten der Veranstaltung ID=\{ $eventId \}\.
msg-service-search-no-events = Keine Veranstaltungen für { $dateText }\.
msg-service-search-error = { $icon } Fehler beim Senden der Suchergebnisse\.
msg-service-search-photo-error = { $icon } Fehler beim Senden des Fotos für Veranstaltung ID={ $eventId }\.
msg-service-search-message-error = { $icon } Fehler beim Senden der Nachricht für Veranstaltung ID={ $eventId }\.
msg-service-search-process-error = { $icon } Fehler bei der Verarbeitung der Veranstaltung ID={ $eventId }\.

# /src/conversations/searchEventConversation.ts
msg-search-event-title = { $icon } Wähle eine Suchoption\:
# Klammern und Doppelpunkt für MarkdownV2 escaped
msg-search-event-date-format = { $icon } Bitte gib ein Datum ein \(Format\: { $format }\)\:
msg-search-event-date-cancel = { $icon } Datumssuche abgebrochen\.
# Ausrufezeichen für MarkdownV2 escaped
msg-search-event-date-invalid = { $icon } Ungültiges Datumsformat\! Bitte verwende das Format { $format }\.
msg-search-event-error = { $icon } Bei der Suche ist ein Fehler aufgetreten\.
msg-search-event-options-error = { $icon } Fehler beim Anzeigen der Suchoptionen\.
msg-search-event-invalid-choice = { $icon } Ungültige Auswahl\.
msg-search-event-choice-error = { $icon } Fehler bei der Verarbeitung der Auswahl\.
msg-search-event-today-error = { $icon } Fehler bei der Suche nach heutigen Veranstaltungen\.
msg-search-event-tomorrow-error = { $icon } Fehler bei der Suche nach morgigen Veranstaltungen\.
msg-search-event-btn-today = { $icon } Heute
msg-search-event-btn-tomorrow = { $icon } Morgen
msg-search-event-btn-specific = { $icon } Datum wählen
msg-search-event-btn-exit = { $icon } Beenden
msg-search-event-btn-cancel = { $icon } Abbrechen
msg-search-event-exit = { $icon } Suche beendet\.
msg-search-event-cancel = { $icon } Suche abgebrochen\.

msg-rules-notice = { $icon } **Wichtiger Hinweis:**\  
    1\. Wir nehmen uns das Recht\, Veranstaltungen\, die nicht unseren Überzeugungen entsprechen\, zu löschen\.
    2\. Wir unterstützen keine Veranstaltungen mit sexistischen\, rassistischen oder allgemein diskriminierenden Inhalten\.
    3\. Unser Service ist unentgeltlich und wird ausschließlich von Freiwilligen betrieben\.
    4\. Aus technischen Gründen speichern wir deine Telegram\-User\-Id\, wenn du Veranstaltungen einreichst\. Ansonsten werden keine weiteren Daten erfasst\. Alle Daten liegen auf den Servern von Telegram\, auf die wir keinen Einfluss haben\.