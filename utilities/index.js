const B = '\`\`\`';
const BB = B + B;

module.exports = 
{
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
    }
}
