const B = '\`\`\`';
const BB = B + B;

module.exports = 
{
    parseAssignmentType: function(args) {
        if (args.length == 0) {
            return 'current'
        }
        else {
            return args[0].trim().toLowerCase();
        }
    },

    buildHomeworkList: async function(assignments) {
        var reply = '';
        for (assignment of assignments) {
            reply += assignment + '\n';
        }
        return reply;
    },

    calculateGrade: async function(grades) {
        score = 0.0;
        total = 0.0;
        reply = B;
        for (var grade of grades) {
            reply += grade + '\n';
            score += grade.score;
            total += grade.total;
        }
        reply += `${BB}Course Grade: ${score}/${total} = ${100.0 * score/total}${B}`;
        return reply;
    },

    buildReposWithTopicList: async function(information, args) {
        var reply = `The following repositories are tagged with \`${args.join('\`, or \`')}\`\n`;
        reply += information.join('\n');
        return reply;
    }
}
