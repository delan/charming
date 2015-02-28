#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <stdint.h>
#include "minilzo.h"

lzo_align_t __LZO_MMODEL work[
	((LZO1X_1_MEM_COMPRESS) + (sizeof(lzo_align_t) - 1)) /
	sizeof(lzo_align_t)
];

size_t contents(char **out, FILE *input) {
	static const size_t block = 4096;
	size_t length = 0;
	size_t alloc = block;
	size_t retval;
	char *result = malloc(alloc);
	do {
		retval = fread(&result[length], 1, block, input);
		length += retval;
		if (length + block > alloc) {
			alloc += block;
			result = realloc(result, alloc);
		}
	} while (retval > 0);
	*out = realloc(result, length);
	return length;
}

int main(int argc, char **argv) {
	char *input_data;
	char *output_data;
	size_t input_length;
	size_t output_length;
	FILE *input_file = fopen(argv[1], "rb");
	FILE *output_file = fopen(argv[2], "wb");
	lzo_init();
	input_length = contents(&input_data, input_file);
	output_data = malloc(
		input_length + input_length / 16 + 64 + 3
	);
	lzo1x_1_compress(
		input_data,
		input_length,
		output_data,
		&output_length,
		work
	);
	fwrite(output_data, 1, output_length, output_file);
	free(output_data);
	free(input_data);
	fclose(output_file);
	fclose(input_file);
	return 0;
}
