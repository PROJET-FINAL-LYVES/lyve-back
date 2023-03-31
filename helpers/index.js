const handleErrorMessages = (errors, fields) => {
    const errorMessages = [];

    fields.forEach(field => {
        if (errors[field]) errorMessages.push(errors[field].message);
    });

    return errorMessages;
}

module.exports = {
    handleErrorMessages
}