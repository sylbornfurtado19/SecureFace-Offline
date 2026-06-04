import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';

export const BenchmarkScreen: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const tfState = useTensorflowModel(require('../../assets/models/mobilefacenet.tflite') as any, [] as any);
  const model = tfState.state === 'loaded' ? (tfState.model as any) : undefined;

  const runBenchmark = async () => {
    if (!model) {
      setResults(prev => [...prev, 'Model not loaded']);
      return;
    }

    setRunning(true);
    setResults([]);

    try {
      const warmupBuffer = new Uint8Array(112 * 112 * 3).buffer;
      // warmup
      await model.run([warmupBuffer]);

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const input = new Uint8Array(112 * 112 * 3).buffer;
        const t0 = Date.now();
        await model.run([input]);
        const t1 = Date.now();
        times.push(t1 - t0);
        setResults(prev => [...prev, `Iter ${i + 1}: ${t1 - t0} ms`]);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      setResults(prev => [...prev, `Average inference time: ${avg.toFixed(2)} ms`]);
    } catch (e) {
      setResults(prev => [...prev, `Benchmark error: ${e}`]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MobileFaceNet Benchmark</Text>
      <Text style={styles.subtitle}>Model: mobilefacenet.tflite (112x112 RGB uint8)</Text>
      <View style={styles.btn}>
        {running ? (
          <ActivityIndicator />
        ) : (
          <Button title="Run Benchmark (10 iters)" onPress={runBenchmark} />
        )}
      </View>
      <ScrollView style={styles.results}>
        {results.map((r, i) => (
          <Text key={i} style={styles.resultText}>{r}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: '#ddd', marginBottom: 12 },
  btn: { marginBottom: 12 },
  results: { backgroundColor: '#111', padding: 8, borderRadius: 6 },
  resultText: { color: '#fff', marginBottom: 6 },
});

export default BenchmarkScreen;
