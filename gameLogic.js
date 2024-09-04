const {
    factorial,
    isPrime,
    parseExpression,
    simplifyExpression,
    evaluateExpression
} = require('./mathOperations');
const {calculateComplexity} = require('./complexityCalculator');
const {
    saveStats,
    getStats,
    updateStats,
    getCurrentCount,
    setCurrentCount,
    getLastUser,
    setLastUser
} = require('./statsManager');

async function processMessage(message, say, client, isEval = false) {
    if (!/^[\d+\-*/^√().\s!]+$|^.*sqrt\(.*\).*$/.test(message.text)) {
        return;
    }

    let number;
    let expression;
    let complexity;
    try {
        expression = parseExpression(message.text);
        number = Math.round(await evaluateExpression(expression)); // Round the result
        complexity = calculateComplexity(message.text);

        if (isEval) {
            // For !eval, just return the result without affecting game state
            return `Expression: ${message.text}, Evaluated: ${number}, Complexity: ${complexity}`;
        }

        const stats = getStats();
        if (complexity > stats.mostComplicatedOperation.complexity) {
            updateStats({
                mostComplicatedOperation: {
                    expression: message.text,
                    user: message.user,
                    complexity: complexity
                }
            });
            await saveStats();
        }

    } catch (error) {
        console.log('Error evaluating expression:', error);
        if (isEval) {
            return `Error evaluating expression: ${error.message}`;
        }
        return;
    }

    const stats = getStats();
    if (!stats.userStats[message.user]) {
        stats.userStats[message.user] = {
            successful: 0,
            unsuccessful: 0,
            totalComplexity: 0,
            countWithComplexity: 0
        };
        updateStats({userStats: stats.userStats});
    }

    const lastUser = getLastUser();
    let currentCount = getCurrentCount();

    if (message.user === lastUser) {
        await handleIncorrectCount(message, say, client, "You can't count twice in a row.");
    } else if (number !== currentCount) {
        await handleIncorrectCount(message, say, client, `The next number should have been ${currentCount}.`);
    } else {
        await handleCorrectCount(message, say, client, number, complexity);
    }

    // Add a return statement here
    return `Expression: ${message.text}, Evaluated: ${number}, Complexity: ${complexity}`;
}

async function handleIncorrectCount(message, say, client, reason) {
    await say(`<@${message.user}> messed up! ${reason} The count resets to 1.`);
    setCurrentCount(1);
    updateStats({currentCount: 1});
    setLastUser(null);
    const stats = getStats();
    stats.userStats[message.user].unsuccessful++;
    updateStats({userStats: stats.userStats});
    await client.reactions.add({
        channel: message.channel,
        timestamp: message.ts,
        name: 'x'
    });
    await saveStats();
}

async function handleCorrectCount(message, say, client, number, complexity) {
    try {
        let reactionEmoji = getReactionEmoji(number);
        await client.reactions.add({
            channel: message.channel,
            timestamp: message.ts,
            name: reactionEmoji
        });

        await checkAndHandleMilestones(message, say, number);

        updateGameState(message.user, number, complexity);
        await saveStats();
    } catch (error) {
        console.error(error);
    }
}

function getReactionEmoji(number) {
    switch (number) {
        case 42: return 'rocket';
        case 69: return 'cancer';
        case 314: return 'pie';
        case 420: return 'herb';
        case 666: return 'smiling_imp';
        case 777: return 'four_leaf_clover';
        case 1000: return 'fireworks';
        case 1234: return '1234';
        case 1337: return 'computer';
        case 2048: return 'jigsaw';
        case 3141: return 'abacus';
        case 5000: return 'raised_hand_with_fingers_splayed';
        case 9000: return 'muscle';
        case 12345: return '1234';
        default:
            if (number % 100 === 0) return '💯';
            return 'white_check_mark';
    }
}

async function checkAndHandleMilestones(message, say, number) {
    const specialMilestones = [
        42,    // The Answer to Life, the Universe, and Everything
        69,    // Nice
        314,   // Pi
        420,   // Herb
        666,   // Devil's number
        777,   // Lucky number
        1000,  // Big round number
        1234,  // Sequential numbers
        1337,  // LEET
        2048,  // Popular game
        3141,  // More digits of Pi
        5000,  // Another big milestone
        9000,  // It's over 9000!
        12345  // More sequential numbers
    ];

    if (number % 100 === 0 || specialMilestones.includes(number)) {
        const stats = getStats();
        stats.milestones[number] = message.user;
        updateStats({milestones: stats.milestones});

        const emoji = getReactionEmoji(number);
        await say(`${emoji} Congratulations <@${message.user}>! You've reached ${number}! ${emoji}`);
    }
}

function updateGameState(user, number, complexity) {
    const stats = getStats();
    let currentCount = getCurrentCount();

    currentCount++;
    setCurrentCount(currentCount);
    updateStats({currentCount: currentCount});
    setLastUser(user);
    stats.totalSuccessfulCounts++;
    stats.userStats[user].successful++;
    stats.userStats[user].totalComplexity += complexity;
    stats.userStats[user].countWithComplexity++;
    if (currentCount > stats.highestCount) {
        stats.highestCount = currentCount - 1;
        stats.highestCountTimestamp = new Date().toISOString();
    }
    updateStats(stats);

    // Track prime numbers
    if (isPrime(currentCount - 1)) {
        stats.userStats[user].primes = (stats.userStats[user].primes || 0) + 1;
    }

    // Track perfect squares
    if (Math.sqrt(currentCount - 1) % 1 === 0) {
        stats.userStats[user].perfectSquares = (stats.userStats[user].perfectSquares || 0) + 1;
    }

    updateStats({userStats: stats.userStats});
}

module.exports = {
    processMessage,
    getReactionEmoji,  // Add this line
    checkAndHandleMilestones,
    updateGameState
};
