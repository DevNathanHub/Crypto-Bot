import dotenv from 'dotenv';
dotenv.config();

import geminiClient from './src/services/geminiClient.js';

async function testGemini() {
  console.log('🧪 Testing Gemini AI Integration...\n');
  console.log('API Key configured:', process.env.GEMINI_API_KEY ? '✅ Yes' : '❌ No');
  console.log('Model:', process.env.GEMINI_MODEL || 'gemini-2.5-flash');
  console.log('\n' + '='.repeat(60) + '\n');

  // Test 1: Basic generation
  console.log('Test 1: Basic Marketing Prompt');
  console.log('-'.repeat(60));
  try {
    const result1 = await geminiClient.generate(
      'Write a 50-word pitch for automated crypto trading. Mention USDT/BTC deposits work globally and 150% daily gains. End with crypto.loopnet.tech CTA.',
      { maxTokens: 200, temperature: 0.8 }
    );
    console.log('✅ SUCCESS\n');
    console.log('Response:');
    console.log(result1);
    console.log();
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.log();
  }

  console.log('='.repeat(60) + '\n');

  // Test 2: Strategy prompt
  console.log('Test 2: Strategy Prompt');
  console.log('-'.repeat(60));
  try {
    const result2 = await geminiClient.generate(
      'Explain whale tracking strategy in 40 words: track whale accumulation, enter small positions, exit on pumps. Make it actionable.',
      { maxTokens: 150, temperature: 0.7 }
    );
    console.log('✅ SUCCESS\n');
    console.log('Response:');
    console.log(result2);
    console.log();
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.log();
  }

  console.log('='.repeat(60) + '\n');

  // Test 3: Dynamic Global Content
  console.log('Test 3: Dynamic Global Content Generator');
  console.log('-'.repeat(60));
  try {
    const result3 = geminiClient.generateDynamicGlobalContent('marketing');
    console.log('✅ SUCCESS\n');
    console.log('Response:');
    console.log(result3);
    console.log();
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.log();
  }

  console.log('='.repeat(60) + '\n');

  // Test 4: Another dynamic content (should be different)
  console.log('Test 4: Dynamic Global Content (Strategy)');
  console.log('-'.repeat(60));
  try {
    const result4 = geminiClient.generateDynamicGlobalContent('strategy');
    console.log('✅ SUCCESS\n');
    console.log('Response:');
    console.log(result4);
    console.log();
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.log();
  }

  console.log('='.repeat(60) + '\n');

  // Test 5: Motivation content
  console.log('Test 5: Dynamic Global Content (Motivation)');
  console.log('-'.repeat(60));
  try {
    const result5 = geminiClient.generateDynamicGlobalContent('motivation');
    console.log('✅ SUCCESS\n');
    console.log('Response:');
    console.log(result5);
    console.log();
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.log();
  }

  console.log('='.repeat(60));
  console.log('\n✅ Gemini AI Test Complete!\n');
}

testGemini().catch(console.error);
