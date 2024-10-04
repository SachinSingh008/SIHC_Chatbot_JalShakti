$(document).ready(function() {
    $('#chat-button').click(openChat);
    $('#send-button').click(sendMessage);
    $('#user-message').keypress(function(e) {
        if (e.which == 13) {
            sendMessage();
            return false;
        }
    });
    $('#clear-chat').click(clearChat);
    $('#voice-button').click(startVoiceInput);
    $('#back-button').click(closeChat);
    var isFirstMessage = true;
    
    function sendMessage() {
        var userInput = $('#user-message').val().trim();
        
        if (userInput === '') return;

        displayUserMessage(userInput);
        $('#user-message').val('');

        showThinking();

        $.ajax({
            url: '/get_response',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                message: userInput,
                is_first_message: isFirstMessage
            }),
            success: function(data) {
                hideThinking();
                if (data.error) {
                    displayBotMessage("I apologize, but I encountered an error: " + data.error + ". Please try again or contact support if the issue persists.", userInput);
                } else {
                    displayBotMessage(data.response, userInput);
                }
                isFirstMessage = false;
            },
            error: function(jqXHR, textStatus, errorThrown) {
                hideThinking();
                console.error("AJAX error: " + textStatus + ' : ' + errorThrown);
                displayBotMessage("I'm having trouble connecting to the server. Please check your internet connection and try again. If the problem persists, please contact support.", userInput);
            }
        });
    }
    
    $('#terminate-button').click(terminateMessage);
});

function openChat() {
    $('#chat-container').show();
    $('#chat-button').hide();
    
    if ($('#chatbox').is(':empty')) {
        displayBotMessage("Hello! I'm Jal Mitra, your AI assistant for groundwater information. How can I help you today?");
    }
}

function closeChat() {
    $('#chat-container').hide();
    $('#chat-button').show();
}

function displayUserMessage(message) {
    var messageContainer = $('<div class="message-container"></div>');
    messageContainer.append('<div class="message user-message">' + message + '</div>');
    $('#chatbox').append(messageContainer);
    $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
}

function displayBotMessage(response, userInput) {
    var messageContainer = $('<div class="message-container"></div>');
    var botMessageContainer = $('<div class="bot-message-container"></div>');
    var botLogo = $('<img class="bot-logo" src="https://www.pngmart.com/files/16/Vector-Lawyer-Transparent-PNG.png" alt="Jal Mitra">');
    var botMessageDiv = $('<div class="message bot-message"></div>');

    botMessageContainer.append(botLogo);
    botMessageContainer.append(botMessageDiv);
    messageContainer.append(botMessageContainer);
    $('#chatbox').append(messageContainer);

    $('#send-button, #voice-button').hide();
    $('#terminate-button').show();

    var points = response.split('\n').filter(point => point.trim() !== '');

    function displayNextPoint(index) {
        if (index < points.length) {
            var pointDiv = $('<div class="bot-point"></div>');
            botMessageDiv.append(pointDiv);

            var currentPoint = points[index].replace(/^\s*[\*\-]\s*/, '');
            var pointText = (index + 1) + '. ' + currentPoint;

            pointText = pointText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            var charIndex = 0;
            var htmlContent = '';

            function displayNextCharacter() {
                if (charIndex < pointText.length && !window.terminateMessageFlag) {
                    if (pointText.substr(charIndex, 8) === '<strong>') {
                        htmlContent += '<strong>';
                        charIndex += 8;
                    } else if (pointText.substr(charIndex, 9) === '</strong>') {
                        htmlContent += '</strong>';
                        charIndex += 9;
                    } else {
                        htmlContent += pointText[charIndex];
                        charIndex++;
                    }
                    pointDiv.html(htmlContent);
                    
                    var chatbox = $('#chatbox')[0];
                    if (chatbox.scrollHeight - chatbox.scrollTop === chatbox.clientHeight) {
                        chatbox.scrollTop = chatbox.scrollHeight;
                    }
                    
                    setTimeout(displayNextCharacter, 30);
                } else {
                    if (!window.terminateMessageFlag) {
                        addDetailLink(pointDiv, currentPoint);
                        setTimeout(() => displayNextPoint(index + 1), 500);
                    } else {
                        finishMessageDisplay();
                    }
                }
            }

            displayNextCharacter();
        } else {
            finishMessageDisplay();
        }
    }

    displayNextPoint(0);
}

function terminateMessage() {
    window.terminateMessageFlag = true;
}

function finishMessageDisplay() {
    addSuggestions($('.bot-message:last'));
    $('#send-button, #voice-button').show();
    $('#terminate-button').hide();
    window.terminateMessageFlag = false;
}

function addDetailLink(pointDiv, originalMessage) {
    var detailLink = $('<a href="#" class="detail-link">More Details</a>');
    pointDiv.append(' ');
    pointDiv.append(detailLink);

    detailLink.click(function(e) {
        e.preventDefault();
        requestMoreDetails(originalMessage);
    });
}

function requestMoreDetails(originalMessage) {
    showThinking();

    $.ajax({
        url: '/get_details',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ message: originalMessage }),
        success: function(data) {
            hideThinking();
            displayBotMessage(data.response, originalMessage);
        },
        error: function() {
            hideThinking();
            displayBotMessage("Sorry, I couldn't fetch more details at the moment. Please try again later.");
        }
    });
}

function showThinking() {
    var thinkingHtml = '<div class="thinking"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
    $('#chatbox').append(thinkingHtml);
    $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
}

function hideThinking() {
    $('.thinking').remove();
}

function addSuggestions(messageDiv) {
    var allSuggestions = [
        { text: 'Water level in my area', link: 'https://ejalshakti.gov.in/JJM/JJMReports/profiles/rpt_VillageProfile.aspx' },
        { text: 'Groundwater quality', link: '#' },
        { text: 'How to obtain NOC', link: 'https://cgwa-noc.gov.in/LandingPage/index.htm' },
        { text: 'Groundwater management practices', link: '#' },
        { text: 'Latest groundwater assessment report', link: 'https://jalshakti-dowr.gov.in/annual-reports-2/' },
        { text: 'Training programs on groundwater', link: 'https://jalshakti-dowr.gov.in/schemes-programmes/' },
        { text: 'Generate area report', link: '#' },
    ];

    var currentPage = 1;
    var suggestionsPerPage = 3; 

    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength - 3) + '...';
        }
        return text;
    }

    function displaySuggestions(page) {
        var start = (page - 1) * suggestionsPerPage;
        var end = start + suggestionsPerPage;
        var pageSuggestions = allSuggestions.slice(start, end);

        var suggestionsHtml = '<div class="suggestions">';
        pageSuggestions.forEach(function(suggestion) {
            if (suggestion.text === 'Generate area report') {
                suggestionsHtml += `
                    <div class="suggestion-item" onclick="generateAreaReport()">
                        ${truncateText(suggestion.text, 30)}
                    </div>
                `;
            } else {
                suggestionsHtml += `
                    <div class="suggestion-item" onclick="window.location.href='${suggestion.link}'">
                        ${truncateText(suggestion.text, 30)}
                    </div>
                `;
            }
        });

        var totalPages = Math.ceil(allSuggestions.length / suggestionsPerPage);
        suggestionsHtml += `
            <div class="suggestion-navigation">
                <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span>${currentPage} / ${totalPages}</span>
                <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;

        suggestionsHtml += '</div>';
        messageDiv.append(suggestionsHtml);
    }

    function changePage(newPage) {
        if (newPage >= 1 && newPage <= Math.ceil(allSuggestions.length / suggestionsPerPage)) {
            currentPage = newPage;
            $('.suggestions').remove();
            displaySuggestions(currentPage);
        }
    }

    displaySuggestions(currentPage);

    window.changePage = changePage;
}

function startVoiceInput() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        var recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-IN';
        recognition.start();
        
        recognition.onresult = function(event) {
            var transcript = event.results[0][0].transcript;
            $('#user-message').val(transcript);
            sendMessage();
        };
    } else {
        alert("Sorry, your browser doesn't support speech recognition. Please try using a modern browser like Chrome.");
    }
}

function clearChat() {
    $('#chatbox').empty();
    displayBotMessage("Chat cleared. How else can I assist you with groundwater information?");
}

function generateAreaReport() {
    var area = prompt("Please enter the name of the area for which you want to generate a report:");
    if (area) {
        showThinking();
        $.ajax({
            url: '/generate_report',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ area_of_interest: area }),
            success: function(data) {
                hideThinking();
                displayBotMessage("Here's the comprehensive report for " + area + ":\n\n" + data.report);
            },
            error: function() {
                hideThinking();
                displayBotMessage("I'm sorry, I couldn't generate the report at the moment. Please try again later.");
            }
        });
    }
}

// Make necessary functions global
window.generateAreaReport = generateAreaReport;
window.changePage = changePage;