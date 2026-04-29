/**
 * Code Generator - Multi-Language API Client Generation
 * GSoC-Level: Generate code snippets in multiple languages
 */

class CodeGenerator {
    /**
     * Generate code in specified language
     */
    generate(language, config) {
        const generators = {
            'curl': this.generateCurl.bind(this),
            'python': this.generatePython.bind(this),
            'javascript': this.generateJavaScript.bind(this),
            'node': this.generateNodeJS.bind(this),
            'go': this.generateGo.bind(this),
            'java': this.generateJava.bind(this),
            'php': this.generatePHP.bind(this),
            'ruby': this.generateRuby.bind(this),
            'powershell': this.generatePowerShell.bind(this)
        };

        const generator = generators[language.toLowerCase()];
        if (!generator) {
            throw new Error(`Unsupported language: ${language}`);
        }

        return generator(config);
    }

    /**
     * Generate curl command
     */
    generateCurl(config) {
        const { method, url, headers, body } = config;

        let cmd = `curl -X ${method} "${url}"`;

        // Add headers
        if (headers && Object.keys(headers).length > 0) {
            cmd += ' \\';
            for (const [key, value] of Object.entries(headers)) {
                cmd += `\n  -H "${key}: ${value}" \\`;
            }
            cmd = cmd.slice(0, -2); // Remove last backslash
        }

        // Add body
        if (body) {
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
            cmd += ` \\\n  -d '${bodyStr}'`;
        }

        return cmd;
    }

    /**
     * Generate Python requests code
     */
    generatePython(config) {
        const { method, url, headers, body } = config;

        let code = 'import requests\n\n';
        code += `url = "${url}"\n`;

        // Headers
        if (headers && Object.keys(headers).length > 0) {
            code += 'headers = {\n';
            for (const [key, value] of Object.entries(headers)) {
                code += `    "${key}": "${value}",\n`;
            }
            code += '}\n';
        }

        // Body
        if (body) {
            code += 'data = ';
            code += JSON.stringify(body, null, 4);
            code += '\n';
        }

        // Request
        code += `\nresponse = requests.${method.toLowerCase()}(url`;
        if (headers && Object.keys(headers).length > 0) {
            code += ', headers=headers';
        }
        if (body) {
            code += ', json=data';
        }
        code += ')\n';
        code += 'print(response.json())';

        return code;
    }

    /**
     * Generate JavaScript fetch code
     */
    generateJavaScript(config) {
        const { method, url, headers, body } = config;

        let code = `const url = "${url}";\n\n`;

        code += 'const options = {\n';
        code += `  method: "${method}",\n`;

        // Headers
        if (headers && Object.keys(headers).length > 0) {
            code += '  headers: {\n';
            for (const [key, value] of Object.entries(headers)) {
                code += `    "${key}": "${value}",\n`;
            }
            code += '  },\n';
        }

        // Body
        if (body) {
            code += '  body: JSON.stringify(';
            code += JSON.stringify(body, null, 4);
            code += ')\n';
        }

        code += '};\n\n';
        code += 'fetch(url, options)\n';
        code += '  .then(response => response.json())\n';
        code += '  .then(data => console.log(data))\n';
        code += '  .catch(error => console.error(error));';

        return code;
    }

    /**
     * Generate Node.js code (using axios)
     */
    generateNodeJS(config) {
        const { method, url, headers, body } = config;

        let code = 'const axios = require(\'axios\');\n\n';

        code += 'const config = {\n';
        code += `  method: '${method.toLowerCase()}',\n`;
        code += `  url: '${url}',\n`;

        // Headers
        if (headers && Object.keys(headers).length > 0) {
            code += '  headers: {\n';
            for (const [key, value] of Object.entries(headers)) {
                code += `    '${key}': '${value}',\n`;
            }
            code += '  },\n';
        }

        // Body
        if (body) {
            code += '  data: ';
            code += JSON.stringify(body, null, 4);
            code += '\n';
        }

        code += '};\n\n';
        code += 'axios(config)\n';
        code += '  .then(response => console.log(response.data))\n';
        code += '  .catch(error => console.error(error));';

        return code;
    }

    /**
     * Generate Go code
     */
    generateGo(config) {
        const { method, url, headers, body } = config;

        let code = 'package main\n\n';
        code += 'import (\n';
        code += '    "bytes"\n';
        code += '    "encoding/json"\n';
        code += '    "fmt"\n';
        code += '    "net/http"\n';
        code += ')\n\n';
        code += 'func main() {\n';
        code += `    url := "${url}"\n`;

        // Body
        if (body) {
            code += '    data := map[string]interface{}';
            code += JSON.stringify(body, null, 8);
            code += '\n';
            code += '    jsonData, _ := json.Marshal(data)\n';
            code += '    req, _ := http.NewRequest("' + method + '", url, bytes.NewBuffer(jsonData))\n';
        } else {
            code += '    req, _ := http.NewRequest("' + method + '", url, nil)\n';
        }

        // Headers
        if (headers && Object.keys(headers).length > 0) {
            for (const [key, value] of Object.entries(headers)) {
                code += `    req.Header.Set("${key}", "${value}")\n`;
            }
        }

        code += '\n    client := &http.Client{}\n';
        code += '    resp, err := client.Do(req)\n';
        code += '    if err != nil {\n';
        code += '        panic(err)\n';
        code += '    }\n';
        code += '    defer resp.Body.Close()\n';
        code += '    fmt.Println(resp.Status)\n';
        code += '}';

        return code;
    }

    /**
     * Generate Java code
     */
    generateJava(config) {
        const { method, url, headers, body } = config;

        let code = 'import java.net.http.*;\n';
        code += 'import java.net.URI;\n\n';
        code += 'public class APIClient {\n';
        code += '    public static void main(String[] args) throws Exception {\n';
        code += '        HttpClient client = HttpClient.newHttpClient();\n';
        code += `        HttpRequest.Builder builder = HttpRequest.newBuilder()\n`;
        code += `            .uri(URI.create("${url}"))\n`;
        code += `            .method("${method}", `;

        if (body) {
            code += 'HttpRequest.BodyPublishers.ofString(';
            code += JSON.stringify(JSON.stringify(body));
            code += '))';
        } else {
            code += 'HttpRequest.BodyPublishers.noBody())';
        }

        // Headers
        if (headers && Object.keys(headers).length > 0) {
            for (const [key, value] of Object.entries(headers)) {
                code += `\n            .header("${key}", "${value}")`;
            }
        }

        code += ';\n\n';
        code += '        HttpRequest request = builder.build();\n';
        code += '        HttpResponse<String> response = client.send(request,\n';
        code += '            HttpResponse.BodyHandlers.ofString());\n';
        code += '        System.out.println(response.body());\n';
        code += '    }\n';
        code += '}';

        return code;
    }

    /**
     * Generate PHP code
     */
    generatePHP(config) {
        const { method, url, headers, body } = config;

        let code = '<?php\n\n';
        code += '$curl = curl_init();\n\n';

        code += 'curl_setopt_array($curl, [\n';
        code += `    CURLOPT_URL => "${url}",\n`;
        code += '    CURLOPT_RETURNTRANSFER => true,\n';
        code += `    CURLOPT_CUSTOMREQUEST => "${method}",\n`;

        // Headers
        if (headers && Object.keys(headers).length > 0) {
            code += '    CURLOPT_HTTPHEADER => [\n';
            for (const [key, value] of Object.entries(headers)) {
                code += `        "${key}: ${value}",\n`;
            }
            code += '    ],\n';
        }

        // Body
        if (body) {
            code += '    CURLOPT_POSTFIELDS => json_encode(';
            code += JSON.stringify(body);
            code += '),\n';
        }

        code += ']);\n\n';
        code += '$response = curl_exec($curl);\n';
        code += 'curl_close($curl);\n';
        code += 'echo $response;';

        return code;
    }

    /**
     * Generate Ruby code
     */
    generateRuby(config) {
        const { method, url, headers, body } = config;

        let code = 'require \'net/http\'\n';
        code += 'require \'json\'\n\n';
        code += `uri = URI('${url}')\n`;
        code += `req = Net::HTTP::${this.capitalizeFirst(method.toLowerCase())}.new(uri)\n`;

        // Headers
        if (headers && Object.keys(headers).length > 0) {
            for (const [key, value] of Object.entries(headers)) {
                code += `req['${key}'] = '${value}'\n`;
            }
        }

        // Body
        if (body) {
            code += 'req.body = ';
            code += JSON.stringify(body);
            code += '.to_json\n';
        }

        code += '\nres = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|\n';
        code += '  http.request(req)\n';
        code += 'end\n';
        code += 'puts res.body';

        return code;
    }

    /**
     * Generate PowerShell code
     */
    generatePowerShell(config) {
        const { method, url, headers, body } = config;

        let code = '$headers = @{\n';
        if (headers && Object.keys(headers).length > 0) {
            for (const [key, value] of Object.entries(headers)) {
                code += `    "${key}" = "${value}"\n`;
            }
        }
        code += '}\n\n';

        if (body) {
            code += '$body = @\'\n';
            code += JSON.stringify(body, null, 2);
            code += '\n\'@\n\n';
        }

        code += `$response = Invoke-RestMethod -Uri "${url}" -Method ${method} -Headers $headers`;
        if (body) {
            code += ' -Body $body -ContentType "application/json"';
        }
        code += '\n$response | ConvertTo-Json';

        return code;
    }

    /**
     * Helper: Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Generate all supported languages
     */
    generateAll(config) {
        const languages = [
            'curl', 'python', 'javascript', 'node',
            'go', 'java', 'php', 'ruby', 'powershell'
        ];

        const result = {};
        for (const lang of languages) {
            try {
                result[lang] = this.generate(lang, config);
            } catch (error) {
                result[lang] = `// Error generating ${lang}: ${error.message}`;
            }
        }

        return result;
    }
}

module.exports = CodeGenerator;
