export const handler = async (event) => {
  try {
    console.log("send-ticket-manually: Função simplificada iniciada.");
    console.log("send-ticket-manually: Event body recebido:", event.body);

    // Apenas para testar se a função está sendo executada
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Função simplificada executada com sucesso!" }),
    };
  } catch (error) {
    console.error("send-ticket-manually: Erro na função simplificada:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro interno na função simplificada: " + error.message }),
    };
  }
};
