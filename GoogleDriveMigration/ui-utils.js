function onOpen(e) {
    SpreadsheetApp.getUi()
        .createMenu('My Menu')
        .addItem('My menu item', 'myFunction')
        .addSeparator()
        .addSubMenu(SpreadsheetApp.getUi().createMenu('My sub-menu')
            .addItem('One sub-menu item', 'mySecondFunction')
            .addItem('Another sub-menu item', 'myThirdFunction'))
        .addToUi();
}


function uiStuff () {
    const ui = SpreadsheetApp.getUi();
    let response = ui.prompt('The report will be generated from the second sheet (first one after this sheet) th', 'Enter a date in MMDDYYYY form', ui.ButtonSet.OK_CANCEL);
    let sheetName = '';
    if (response.getSelectedButton() == ui.Button.OK) {
        sheetName = response.getResponseText();
    } else {
        ui.alert('Cancelling...');
        return;
    }
}

