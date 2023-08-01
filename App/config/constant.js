const constant = {
    green_sight_lowes : {
        container_name : 'lowes',
        azure_string : process.env.AZURE_STORAGE_CONNECTION_STRING
    },
    green_sight_schneider : {
        container_name : 'schneider',
        azure_string : process.env.AZURE_STORAGE_CONNECTION_STRING
    },
    green_sight_general_mills : {
        container_name : 'generalmills',
        azure_string : process.env.AZURE_STORAGE_CONNECTION_STRING
    },
    green_sight_main : {
        container_name : 'greensight',
        azure_string : process.env.AZURE_STORAGE_CONNECTION_STRING_TESTING
    }
}

module.exports = { constant };