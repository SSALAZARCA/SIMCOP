const text1 = '<think> I am thinking... </think> { "plan": "foo" }';
const result1 = text1.replace(/<(?:thought|think|thinking|reasoning)[^>]*>[\s\S]*?(?:<\/(?:thought|think|thinking|reasoning)>|$)/gi, '');
console.log('Result 1 (closed tag):', result1);

const text2 = '<think> I am thinking... \n { "plan": "foo" }';
const result2 = text2.replace(/<(?:thought|think|thinking|reasoning)[^>]*>[\s\S]*?(?:<\/(?:thought|think|thinking|reasoning)>|$)/gi, '');
console.log('Result 2 (unclosed tag):', result2);
